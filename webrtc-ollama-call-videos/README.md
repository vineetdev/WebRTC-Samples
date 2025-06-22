markdown
# WebRTC Ollama Video Call App

A real-time video call application that lets you have conversations with Ollama AI (llama3.2) through WebRTC.

## Features

- 🎥 Real-time video call interface
- 🤖 AI conversation with Ollama (llama3.2)
- 🌊 Animated waveform visualization for AI responses
- 🎤 Microphone mute/unmute controls
- 📹 Camera on/off controls
- 💬 Real-time chat with AI
- 🔊 Text-to-speech for AI responses
- 📱 Responsive design

## Prerequisites

1. **Node.js** (v14 or higher)
2. **Ollama** installed on Windows
3. **llama3.2** model downloaded in Ollama

## Setup Instructions

### 1. Install Ollama (if not already installed)

1. Download Ollama for Windows from: https://ollama.ai/download
2. Install and run Ollama
3. Open Command Prompt(Bash) and run:
   ```bash
   Check version of ollama by below command:
   $ ollama -v 
   
   Then run below command to pull llama3.2
   $ ollama pull llama3.2
   ```

### 2. Install and Run the App

1. Create a folder called `webrtc-ollama-call`
2. Copy all the files from this package into the folder
3. Open Command Prompt/Terminal in the folder
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start the server:
   ```bash
   npm start
   ```
6. Open your browser and go to: http://localhost:3000

## Usage

1. Make sure Ollama is running (check by visiting http://localhost:11434 in browser)
2. Click "Start Call" to begin the video session
3. Allow camera/microphone permissions when prompted
4. Type messages in the chat box to talk with the AI
5. The AI will respond with text and speech
6. Use the mute/camera buttons to control your media
7. Click "End Call" to finish the session

## Troubleshooting

### Ollama Connection Issues
- Ensure Ollama is running: `ollama serve`
- Check if llama3.2 is installed: `ollama list`
- Verify Ollama is accessible at http://localhost:11434

### Camera/Microphone Issues
- Grant browser permissions for camera and microphone
- Try using Chrome or Firefox for best WebRTC support
- Check if other applications are using the camera/microphone

### Audio Issues
- If text-to-speech doesn't work, check browser audio settings
- Some browsers may block autoplay - interact with the page first
- Try refreshing the page if audio stops working

## License

MIT License - feel free to modify and distribute

---

**Made with ❤️ for AI-powered video communication**
```