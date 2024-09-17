'use strict';

const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
callButton.disabled = true;
hangupButton.disabled = true;
startButton.addEventListener('click', start);
callButton.addEventListener('click', call);
hangupButton.addEventListener('click', hangup);

let startTime;
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

console.log('WebRTC Deepdive ');
console.log('Example: RTCPeerConnection demo');

localVideo.addEventListener('loadedmetadata', function() {
  console.log(`Local video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
});

remoteVideo.addEventListener('loadedmetadata', function() {
  console.log(`Remote video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
});

remoteVideo.addEventListener('resize', () => {
  console.log(`Remote video size changed to ${remoteVideo.videoWidth}x${remoteVideo.videoHeight} - Time since pageload ${performance.now().toFixed(0)}ms`);
  // We'll use the first onsize callback as an indication that video has started
  // playing out.
  if (startTime) {
    const elapsedTime = window.performance.now() - startTime;
    console.log('Setup time: ' + elapsedTime.toFixed(3) + 'ms');
    startTime = null;
  }
});

let localStream;
let user1;
let user2;
const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

function getName(user) {
  return (user === user1) ? 'user1' : 'user2';
}

function getOtherUser(user) {
  return (user === user1) ? user2 : user1;
}

//start capturing local video
async function start() {
  console.log('Requesting local stream');
  startButton.disabled = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
    console.log('Received local stream');
    localVideo.srcObject = stream;
    localStream = stream;
	console.log('local stream', stream);
    callButton.disabled = false; //enable the call button 
  } catch (e) {
    alert(`getUserMedia() error: ${e.name}`);
  }
}

async function call() {
  callButton.disabled = true;
  hangupButton.disabled = false; //hangup button gets enabled
  
  console.log('Starting call');
  startTime = window.performance.now();
  
  const videoTracks = localStream.getVideoTracks();
  const audioTracks = localStream.getAudioTracks();
  if (videoTracks.length > 0) {
    console.log(`Using video device: ${videoTracks[0].label}`);
  }
  if (audioTracks.length > 0) {
    console.log(`Using audio device: ${audioTracks[0].label}`);
  }
  
  const configuration = {};  //should contain information about the ICE servers/TURNSERVERS to use
  console.log('RTCPeerConnection configuration:', configuration);
  
  //Create local peer connection 
  user1 = new RTCPeerConnection(configuration);
  console.log('Created local peer connection object user1');
  user1.addEventListener('icecandidate', e => onIceCandidate(user1, e));
  
  //Create Remote peer connection 
  user2 = new RTCPeerConnection(configuration);
  console.log('Created remote peer connection object user2');
  user2.addEventListener('icecandidate', e => onIceCandidate(user2, e));
   
  user1.addEventListener('iceconnectionstatechange', e => onIceStateChange(user1, e));
  user2.addEventListener('iceconnectionstatechange', e => onIceStateChange(user2, e));
 
  user2.addEventListener('track', e => gotRemoteStream(user2, e));
  
  //Adds the track which will be streamed to the other side.
  localStream.getTracks().forEach(track => user1.addTrack(track, localStream)); 
  console.log('Added local stream to user1');

  //Create Offer and send
  try {
    console.log('user1 createOffer start');
    const offer = await user1.createOffer(offerOptions);
    await onCreateOfferSuccess(offer);
  } catch (e) {
    onCreateSessionDescriptionError(e);
  }
}

function onCreateSessionDescriptionError(error) {
  console.log(`Failed to create session description: ${error.toString()}`);
}

//Set Local SDP on user1 and remote SDP on user2
async function onCreateOfferSuccess(desc) {
  console.log(`Offer from user1\n${desc.sdp}`);
  console.log('user1 setLocalDescription start');
  try {
    await user1.setLocalDescription(desc);
    onSetLocalSuccess(user1);
  } catch (e) {
    onSetSessionDescriptionError();
  }

  console.log('user2 setRemoteDescription start');
  try {
    await user2.setRemoteDescription(desc);
    onSetRemoteSuccess(user2);
  } catch (e) {
    onSetSessionDescriptionError();
  }

  console.log('user2 createAnswer start');
  
  try {
    const answer = await user2.createAnswer();
    await onCreateAnswerSuccess(answer);
  } catch (e) {
    onCreateSessionDescriptionError(e);
  }
}

function onSetLocalSuccess(user) {
  console.log(`${getName(user)} setLocalDescription complete`);
}

function onSetRemoteSuccess(user) {
  console.log(`${getName(user)} setRemoteDescription complete`);
}

function onSetSessionDescriptionError(error) {
  console.log(`Failed to set session description: ${error.toString()}`);
}

function gotRemoteStream(user2, e) {
  if (remoteVideo.srcObject !== e.streams[0]) {
    remoteVideo.srcObject = e.streams[0];
    console.log('user2 received remote stream', e.streams[0]);
	e.streams[0].getTracks().forEach(track => user2.addTrack(track, e.streams[0]));
  }
}

async function onCreateAnswerSuccess(desc) {
  console.log(`Answer from user2:\n${desc.sdp}`);
  console.log('user2 setLocalDescription start');
  try {
    await user2.setLocalDescription(desc);
    onSetLocalSuccess(user2);
  } catch (e) {
    onSetSessionDescriptionError(e);
  }
  console.log('user1 setRemoteDescription start');
  try {
    await user1.setRemoteDescription(desc);
    onSetRemoteSuccess(user1);
  } catch (e) {
    onSetSessionDescriptionError(e);
  }
}

async function onIceCandidate(user, event) {
  try {
    await (getOtherUser(user).addIceCandidate(event.candidate));
    onAddIceCandidateSuccess(user);
  } catch (e) {
    onAddIceCandidateError(user, e);
  }
  if(event.candidate){
	if(event.candidate.candidate)
		console.log(`${getName(user)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
  }
  else
	  console.log(`${getName(user)} Ice candidate gathering complete`);
}

function onAddIceCandidateSuccess(user) {
  console.log(`${getName(user)} addIceCandidate success`);
}

function onAddIceCandidateError(user, error) {
  console.log(`${getName(user)} failed to add ICE Candidate: ${error.toString()}`);
}

function onIceStateChange(user, event) {
  if (user) {
    console.log(`${getName(user)} ICE state: ${user.iceConnectionState}`);
    console.log('ICE state change event: ', event);
  }
}

function hangup() {
  console.log('Ending call');
  user1.close();
  user2.close();
  user1 = null;
  user2 = null;
  localStream.getTracks().forEach(track => track.stop());
  localStream = null;
  hangupButton.disabled = true;
  callButton.disabled = true;
  startButton.disabled = false;
}
