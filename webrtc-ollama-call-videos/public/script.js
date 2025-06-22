class WebRTCOllamaCall {
    constructor() {
        this.socket = null;
        this.localStream = null;
        this.peerConnection = null;
        this.waveform = null;
        this.isCallActive = false;
        this.isMuted = false;
        this.isCameraOff = false;
        this.currentAIMessage = null;
        this.streamingResponse = '';
        this.isAISpeaking = false;
        
        // Speech recognition properties
        this.speechRecognition = null;
        this.isListening = false;
        this.speechBuffer = '';
        this.finalTranscript = '';
        this.interimTranscript = '';
        
        // Speech synthesis queue for streaming
        this.speechQueue = [];
        this.currentUtterance = null;
        this.isSpeechActive = false;
        this.lastSpeechTime = 0;
        
        this.initializeElements();
        this.initializeSocket();
        this.setupEventListeners();
        setTimeout(() => this.initializeWaveform(), 100);
        this.initializeSpeechRecognition();
    }
    
    initializeElements() {
        this.elements = {
            status: document.getElementById('status'),
            startCallBtn: document.getElementById('startCallBtn'),
            endCallBtn: document.getElementById('endCallBtn'),
            callContainer: document.getElementById('callContainer'),
            localVideo: document.getElementById('localVideo'),
            muteBtn: document.getElementById('muteBtn'),
            cameraBtn: document.getElementById('cameraBtn'),
            voiceBtn: document.getElementById('voiceBtn'),
            chatMessages: document.getElementById('chatMessages'),
            chatInput: document.getElementById('chatInput'),
            sendBtn: document.getElementById('sendBtn'),
            aiStatus: document.getElementById('aiStatus'),
            voiceStatus: document.getElementById('voiceStatus')
        };
    }
    
    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.updateStatus('Connected', true);
            console.log('Connected to server');
        });
        
        this.socket.on('disconnect', () => {
            this.updateStatus('Disconnected', false);
            console.log('Disconnected from server');
        });
        
        // Handle streaming AI responses
        this.socket.on('ai-response-start', () => {
            this.handleAIResponseStart();
        });
        
        this.socket.on('ai-response-chunk', (data) => {
            this.handleAIResponseChunk(data);
        });
        
        this.socket.on('ai-response-end', (data) => {
            this.handleAIResponseEnd(data);
        });
        
        this.socket.on('ai-response-error', (data) => {
            this.handleAIResponseError(data);
        });
    }
    
	updateAvatarVideo(state) {
		const videoContainer = document.querySelector('.video-container');
		if (!videoContainer) return;

		let videoSrc = 'idle.mp4';
		switch (state) {
			case 'thinking':
				videoSrc = 'thinking.mp4';
				break;
			case 'speaking':
				videoSrc = 'speaking.mp4';
				break;
			case 'listening':
			    videoSrc = 'listening.mp4';
			case 'idle':
			default:
				videoSrc = 'idle.mp4';
		}

		let existingVideo = videoContainer.querySelector('video');
		if (!existingVideo) {
			existingVideo = document.createElement('video');
			existingVideo.setAttribute('autoplay', true);
			existingVideo.setAttribute('muted', true);
			existingVideo.setAttribute('loop', true);
			existingVideo.setAttribute('playsinline', true);
			videoContainer.insertBefore(existingVideo, videoContainer.firstChild);
		}

		if (!existingVideo.src.includes(videoSrc)) {
			existingVideo.src = videoSrc;
			existingVideo.load();
			existingVideo.play().catch(err => console.warn('Video play failed:', err));
		}
	}

    initializeWaveform() {
        //this.waveform = new WaveformVisualizer('waveform');
		this.waveform = new WaveformVisualizer((state) => this.updateAvatarVideo(state));
    }
    
    initializeSpeechRecognition() {
        // Check for speech recognition support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported');
            this.elements.voiceBtn.style.display = 'none';
            this.elements.voiceStatus.textContent = 'Speech recognition not supported';
            return;
        }
        
        // Initialize speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.speechRecognition = new SpeechRecognition();
        
        // Configure speech recognition
        this.speechRecognition.continuous = true;
        this.speechRecognition.interimResults = true;
        this.speechRecognition.lang = 'en-US';
        this.speechRecognition.maxAlternatives = 1;
        
        // Speech recognition event handlers
        this.speechRecognition.onstart = () => {
            console.log('Speech recognition started');
            this.isListening = true;
            this.updateVoiceButton();
            this.elements.voiceStatus.textContent = 'Listening...';
            this.elements.voiceStatus.className = 'voice-status listening';
        };
        
        this.speechRecognition.onresult = (event) => {
            this.interimTranscript = '';
            this.finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    this.finalTranscript += transcript + ' ';
                } else {
                    this.interimTranscript += transcript;
                }
            }
            		
			if (this.finalTranscript) {
				this.elements.chatInput.value = this.finalTranscript.trim();
			} else {
				this.elements.chatInput.value = this.interimTranscript.trim();
			}

            // Auto-scroll input to show latest text
            this.elements.chatInput.scrollLeft = this.elements.chatInput.scrollWidth;
        };
        
        this.speechRecognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            this.updateVoiceButton();
            
            let errorMessage = 'Speech recognition error';
            switch (event.error) {
                case 'no-speech':
                    errorMessage = 'No speech detected';
                    break;
                case 'audio-capture':
                    errorMessage = 'Audio capture failed';
                    break;
                case 'not-allowed':
                    errorMessage = 'Microphone permission denied';
                    break;
                case 'network':
                    errorMessage = 'Network error';
                    break;
                default:
                    errorMessage = `Speech error: ${event.error}`;
            }
            
            this.elements.voiceStatus.textContent = errorMessage;
            this.elements.voiceStatus.className = 'voice-status error';
            
            // Reset status after a few seconds
            setTimeout(() => {
                if (!this.isListening) {
                    this.elements.voiceStatus.textContent = 'Click to start voice input';
                    this.elements.voiceStatus.className = 'voice-status';
                }
            }, 3000);
        };
        
        this.speechRecognition.onend = () => {
            console.log('Speech recognition ended');
            this.isListening = false;
            this.updateVoiceButton();
            this.elements.voiceStatus.textContent = 'Click to start voice input';
            this.elements.voiceStatus.className = 'voice-status';
        };
    }
    
    setupEventListeners() {
        this.elements.startCallBtn.addEventListener('click', () => this.startCall());
        this.elements.endCallBtn.addEventListener('click', () => this.endCall());
        this.elements.muteBtn.addEventListener('click', () => this.toggleMute());
        this.elements.cameraBtn.addEventListener('click', () => this.toggleCamera());
        this.elements.voiceBtn.addEventListener('click', () => this.toggleSpeechRecognition());
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }
    
    updateStatus(text, isConnected) {
        this.elements.status.textContent = text;
        this.elements.status.className = isConnected ? 'status connected' : 'status disconnected';
    }
    
    toggleSpeechRecognition() {
        if (!this.speechRecognition) {
            alert('Speech recognition is not supported in your browser');
            return;
        }
        
        if (!this.isCallActive) {
            alert('Please start a call first');
            return;
        }
        
        if (this.isListening) {
            this.stopSpeechRecognition();
        } else {
            this.startSpeechRecognition();
        }
    }
    
    startSpeechRecognition() {
        if (!this.speechRecognition || this.isListening) return;
        
        try {
            // Clear previous transcripts
            this.finalTranscript = '';
            this.interimTranscript = '';
            
            this.speechRecognition.start();
            console.log('Starting speech recognition...');
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            this.elements.voiceStatus.textContent = 'Failed to start voice input';
            this.elements.voiceStatus.className = 'voice-status error';
        }
    }
    
    stopSpeechRecognition() {
        if (!this.speechRecognition || !this.isListening) return;
        
        this.speechRecognition.stop();
        console.log('Stopping speech recognition...');
    }
    
    updateVoiceButton() {
        if (!this.elements.voiceBtn) return;
        
        if (this.isListening) {
            this.elements.voiceBtn.textContent = '🎤🟢';
            this.elements.voiceBtn.className = 'control-btn listening';
        } else {
            this.elements.voiceBtn.textContent = '🎤';
            this.elements.voiceBtn.className = 'control-btn';
        }
    }
    
    async startCall() {
        try {
            // Get user media
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            
            this.elements.localVideo.srcObject = this.localStream;
            
            // Show call interface
            this.elements.callContainer.style.display = 'block';
            this.elements.startCallBtn.style.display = 'none';
            this.elements.endCallBtn.style.display = 'inline-block';
            
            this.isCallActive = true;
            this.addMessage('System', 'Call started! You can now chat with the AI using text or voice.', 'system');
            
            // Start waveform in idle state
            this.waveform.setIdleState();
			this.updateAvatarVideo('idle');
            this.elements.aiStatus.textContent = 'Ready to chat!';
            
            // Show voice status
            this.elements.voiceStatus.textContent = 'Click to start voice input';
           
		
            console.log('Call started successfully');
            
        } catch (error) {
            console.error('Error starting call:', error);
            alert('Could not access camera/microphone. Please check permissions.');
        }
    }
    
    endCall() {
        // Stop speech recognition
        this.stopSpeechRecognition();
        
        // Stop any ongoing speech
        this.stopAllSpeech();
        
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        // Reset UI
        this.elements.callContainer.style.display = 'none';
        this.elements.startCallBtn.style.display = 'inline-block';
        this.elements.endCallBtn.style.display = 'none';
        this.elements.localVideo.srcObject = null;
        
        // Stop waveform
        //this.waveform.stopAnimation();
        
        // Reset state
        this.isCallActive = false;
        this.isMuted = false;
        this.isCameraOff = false;
        this.isAISpeaking = false;
        this.isListening = false;
        this.updateControlButtons();
        this.updateVoiceButton();
        
        // Clear chat
        this.elements.chatMessages.innerHTML = '';
        this.elements.chatInput.value = '';
        
        console.log('Call ended');
    }
    
    toggleMute() {
        if (!this.localStream) return;
        
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            this.isMuted = !this.isMuted;
            audioTrack.enabled = !this.isMuted;
            this.updateControlButtons();
        }
    }
    
    toggleCamera() {
        if (!this.localStream) return;
        
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
            this.isCameraOff = !this.isCameraOff;
            videoTrack.enabled = !this.isCameraOff;
            this.updateControlButtons();
        }
    }
    
    updateControlButtons() {
        this.elements.muteBtn.textContent = this.isMuted ? '🔇' : '🎤';
        this.elements.muteBtn.className = this.isMuted ? 'control-btn muted' : 'control-btn';
        
        this.elements.cameraBtn.textContent = this.isCameraOff ? '📹❌' : '📹';
        this.elements.cameraBtn.className = this.isCameraOff ? 'control-btn muted' : 'control-btn';
    }
    
    sendMessage() {
        const message = this.elements.chatInput.value.trim();
        if (!message || !this.isCallActive) return;
        
        // Prevent sending while AI is responding
        if (this.isAISpeaking) {
            return;
        }
        
        // Stop speech recognition when sending
        if (this.isListening) {
            this.stopSpeechRecognition();
        }
        
        // Add user message to chat
        this.addMessage('You', message, 'user');
        
        // Clear input and disable controls
        this.elements.chatInput.value = '';
        this.elements.chatInput.disabled = true;
        this.elements.sendBtn.disabled = true;
        this.elements.voiceBtn.disabled = true;
        this.elements.chatInput.value = '';
		this.finalTranscript = '';
		this.interimTranscript = '';

        // Show AI thinking
        this.elements.aiStatus.textContent = 'Thinking...';
        this.waveform.setThinkingState();
		this.updateAvatarVideo('thinking');
        
        // Send to AI
        this.socket.emit('ai-message', { message });
    }
    
    handleAIResponseStart() {
        console.log('AI response streaming started');
        this.streamingResponse = '';
        this.isAISpeaking = true;
        this.speechBuffer = '';
        this.lastSpeechTime = Date.now();
        
        // Create empty AI message that will be updated
        this.currentAIMessage = this.addMessage('AI Assistant', '', 'ai', true);
        
        // Update UI - start speaking animation immediately
        this.elements.aiStatus.textContent = 'Speaking...';
        this.waveform.startSpeakingAnimation();
    }
    
    handleAIResponseChunk(data) {
        // Append chunk to streaming response
        this.streamingResponse += data.chunk;
        this.speechBuffer += data.chunk;
        
        // Update the current AI message
        if (this.currentAIMessage) {
            const contentDiv = this.currentAIMessage.querySelector('.message-content');
            if (contentDiv) {
                contentDiv.textContent = this.streamingResponse;
                // Auto-scroll to bottom
                this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
            }
        }
        
        // Process speech buffer for streaming speech
        this.processSpeechBuffer();
    }
    
    processSpeechBuffer() {
        // Only process if we have enough content or enough time has passed
        const currentTime = Date.now();
        const timeSinceLastSpeech = currentTime - this.lastSpeechTime;
        
        // Look for natural breaking points (sentences, phrases)
        const sentences = this.speechBuffer.match(/[^.!?]*[.!?]+/g);
        
        if (sentences && sentences.length > 0) {
            // Speak the complete sentences
            const textToSpeak = sentences.join(' ').trim();
            if (textToSpeak.length > 0) {
                this.speakTextStreaming(textToSpeak);
                // Remove spoken text from buffer
                this.speechBuffer = this.speechBuffer.replace(textToSpeak, '').trim();
                this.lastSpeechTime = currentTime;
            }
        } else if (this.speechBuffer.length > 50 && timeSinceLastSpeech > 1000) {
            // If no sentences but have enough content and time, speak partial
            const words = this.speechBuffer.split(' ');
            if (words.length > 5) {
                const textToSpeak = words.slice(0, Math.floor(words.length / 2)).join(' ');
                this.speakTextStreaming(textToSpeak);
                this.speechBuffer = words.slice(Math.floor(words.length / 2)).join(' ');
                this.lastSpeechTime = currentTime;
            }
        }
    }
    
    handleAIResponseEnd(data) {
        console.log('AI response streaming completed');
        
        // Speak any remaining text in buffer
        if (this.speechBuffer.trim().length > 0) {
            this.speakTextStreaming(this.speechBuffer.trim());
            this.speechBuffer = '';
        }
        
        // Set a timeout to reset UI after speech likely completes
        // Estimate speech time based on text length (average 150 words per minute)
        const estimatedSpeechTime = (this.streamingResponse.split(' ').length / 150) * 60 * 1000;
        setTimeout(() => {
            this.isAISpeaking = false;
            // Re-enable input controls
            this.elements.chatInput.disabled = false;
            this.elements.sendBtn.disabled = false;
            this.elements.voiceBtn.disabled = false;
            this.elements.chatInput.focus();
            
            // Update AI status
            this.elements.aiStatus.textContent = 'Listening...';
            this.waveform.setIdleState();
        }, Math.max(estimatedSpeechTime, 2000)); // Minimum 2 seconds
        
        // Reset for next message
        this.currentAIMessage = null;
        this.streamingResponse = '';
    }
    
    handleAIResponseError(data) {
        console.error('AI response error:', data.message);
        this.isAISpeaking = false;
        
        // Re-enable input controls
        this.elements.chatInput.disabled = false;
        this.elements.sendBtn.disabled = false;
        this.elements.voiceBtn.disabled = false;
        this.elements.chatInput.focus();
        
        // Add error message to chat
        this.addMessage('System', data.message, 'system');
        
        // Reset UI
        this.elements.aiStatus.textContent = 'Ready to chat!';
        this.waveform.setIdleState();
        
        // Reset for next message
        this.currentAIMessage = null;
        this.streamingResponse = '';
        this.speechBuffer = '';
    }
    
	speakTextStreaming(text) {
		if (!('speechSynthesis' in window) || !text.trim()) return;

		const utterance = new SpeechSynthesisUtterance(text);
		utterance.rate = 0.8;
		utterance.pitch = 1;
		utterance.volume = 0.8;

		utterance.onstart = () => {
			if (this.isCallActive){
				console.log('Speech started for:', text.substring(0, 50) + '...');
				this.waveform.startSpeakingAnimation(); // Only animate while actually speaking
			}
			else
				this.stopAllSpeech();
		};

		utterance.onend = () => {
			console.log('Speech ended for chunk');
			if (!this.isCallActive || !speechSynthesis.speaking) {
				this.waveform.setIdleState(); // Stop animation when speech ends
			}
		};

		utterance.onerror = (event) => {
			console.error('Speech error:', event.error);
			this.waveform.setIdleState(); // Also stop on error
		};

		speechSynthesis.speak(utterance);
	}

    stopAllSpeech() {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
        this.speechBuffer = '';
        this.speechQueue = [];
        this.isSpeechActive = false;
		
		this.isAISpeaking = false;

		// Reset AI status UI
		if (this.elements) {
			this.elements.aiStatus.textContent = 'Speech stopped';
			this.elements.chatInput.disabled = false;
			this.elements.sendBtn.disabled = false;
			this.elements.voiceBtn.disabled = false;
		}

		// Reset waveform
		if (this.waveform) {
			this.waveform.setIdleState();
		}
	
    }
    
    addMessage(sender, message, type, isStreaming = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const senderDiv = document.createElement('div');
        senderDiv.className = 'sender';
        senderDiv.textContent = sender;
        
		const timestampDiv = document.createElement('div');
        timestampDiv.className = 'timestamp';
        const now = new Date();
        timestampDiv.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = message;
        
        messageDiv.appendChild(senderDiv);
		messageDiv.appendChild(timestampDiv);
        messageDiv.appendChild(contentDiv);
        
        this.elements.chatMessages.appendChild(messageDiv);
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        
        // Return reference for streaming updates
        if (isStreaming) {
            return messageDiv;
        }
        
        return null;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WebRTCOllamaCall();
});