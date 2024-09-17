'use strict';

const startButton = document.getElementById('startButton');
const hangupButton = document.getElementById('hangupButton');
hangupButton.disabled = true;

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let user; //For the peer connection of user
let localStream;

console.log('WebRTC Deepdive ');
console.log('Example: RTCPeerConnection with signalling');

const signaling = new BroadcastChannel('webrtc'); 
signaling.onmessage = e => {
  if (!localStream) {
    console.log('not ready yet');
    return;
  }
  switch (e.data.type) {
    case 'offer':
	  console.log('signaling.onmessage: received offer');
      handleOffer(e.data);
      break;
    case 'answer':
	  console.log('signaling.onmessage: received answer');
      handleAnswer(e.data);
      break;
    case 'candidate':
	  console.log('signaling.onmessage: received ICE candidate');
	  if(e.data.candidate)
		console.log('ICE candidate ', e.data);
	  else 
		console.log("ICE candidates complete");
      handleCandidate(e.data);
      break;
    case 'ready':
      // A second tab joined. This tab will initiate a call unless in a call already.
	  console.log('signaling.onmessage: second user joined');
      if (user) {
        console.log('signaling.onmessage: user already in call, ignoring');
        return;
      }
	  console.log('signaling.onmessage: triggering call');
      makeCall();
      break;
    case 'bye':
	  console.log('signaling.onmessage: received bye');
      if (user) {
		console.log('signaling.onmessage: hanging up');
        hangup();
      }
      break;
    default:
      console.log('signaling.onmessage: unhandled event', e);
      break;
  }
};

startButton.onclick = async () => {
  // Capture stream from devices
  localStream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
  localVideo.srcObject = localStream;


  startButton.disabled = true;
  hangupButton.disabled = false;
  console.log("posting message ready");
  signaling.postMessage({type: 'ready'});
};

hangupButton.onclick = async () => {
  console.log("ending call");
  hangup();
  console.log("posting message bye");
  signaling.postMessage({type: 'bye'});
};

async function hangup() {
  if (user) {
    user.close();
    user = null;
  }
  localStream.getTracks().forEach(track => track.stop());
  localStream = null;
  startButton.disabled = false;
  hangupButton.disabled = true;
};

function createPeerConnection() {
  user = new RTCPeerConnection();
  console.log("peer connection created");
  user.onicecandidate = e => {
    const message = {
      type: 'candidate',
      candidate: null,
    };
    if (e.candidate) {
      message.candidate = e.candidate.candidate;
      message.sdpMid = e.candidate.sdpMid;
      message.sdpMLineIndex = e.candidate.sdpMLineIndex;
    }
	console.log("posting ICE candidate");
    signaling.postMessage(message);
  };
  user.addEventListener('iceconnectionstatechange', e => onIceStateChange(user, e));
  
  user.ontrack = e => remoteVideo.srcObject = e.streams[0];
  localStream.getTracks().forEach(track => user.addTrack(track, localStream));
}

async function makeCall() {
  console.log("making call");
  await createPeerConnection();

  const offer = await user.createOffer();
  console.log("offer generated ");
  //console.log(offer.sdp);
  signaling.postMessage({type: 'offer', sdp: offer.sdp});
  await user.setLocalDescription(offer);
}

async function handleOffer(offer) {
  if (user) {
    console.error('existing peerconnection');
    return;
  }
  await createPeerConnection();
  console.log("setting remote description");
  await user.setRemoteDescription(offer);

  const answer = await user.createAnswer();
  console.log("answer created");
  signaling.postMessage({type: 'answer', sdp: answer.sdp});
  console.log("setting local description");
  //console.log(answer.sdp);
  await user.setLocalDescription(answer);
}

async function handleAnswer(answer) {
  if (!user) {
    console.error('no peerconnection');
    return;
  }
  console.log('setting remote description');
  await user.setRemoteDescription(answer);
}

async function handleCandidate(candidate) {
  if (!user) {
    console.error('no peerconnection');
    return;
  }
  if (!candidate.candidate) {
    await user.addIceCandidate(null);
  } else {
    await user.addIceCandidate(candidate);
  }
}

function onIceStateChange(user, event) {
  if (user) {
    console.log('ICE state ', user.iceConnectionState);
  }
}

