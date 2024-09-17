'use strict';

const startButton = document.getElementById('startButton');
const closeButton = document.getElementById('closeButton');
const sendButton = document.getElementById('sendButton');
sendButton.onclick = sendData;

const dataChannelSend = document.querySelector('textarea#dataChannelSend');
const dataChannelReceive = document.querySelector('textarea#dataChannelReceive');

let user;
let sendChannel;
let receiveChannel;

const signaling = new BroadcastChannel('webrtc'); //Used for signalling
signaling.onmessage = e => {
  switch (e.data.type) {
    case 'offer':
	  console.log("signalling rcvd offer");
      handleOffer(e.data);
      break;
    case 'answer':
	  console.log("signalling rcvd answer");
      handleAnswer(e.data);
      break;
    case 'candidate':
	  console.log("signalling rcvd candidate");
      handleCandidate(e.data);
      break;
    case 'ready': // A second tab joined.
	  console.log("signalling rcvd ready");
      if (user) {
        console.log('already in call, ignoring');
        return;
      }
      startButton.disabled = false;
      break;
    case 'bye':
	  console.log("signalling rcvd bye");
      if (user) {
        hangup();
      }
      break;
    default:
      console.log('signalling rcvd unhandled', e);
      break;
  }
};
console.log('signalling sending ready');
signaling.postMessage({type: 'ready'});

startButton.onclick = async () => {
  startButton.disabled = true;
  closeButton.disabled = false;

  await createPeerConnection();
  sendChannel = user.createDataChannel('sendDataChannel'); //use DataChannel
  sendChannel.onopen = onSendChannelStateChange;
  sendChannel.onmessage = onSendChannelMessageCallback;
  sendChannel.onclose = onSendChannelStateChange;

  const offer = await user.createOffer();
  console.log('signalling sending offerSDP');
  signaling.postMessage({type: 'offer', sdp: offer.sdp});
  await user.setLocalDescription(offer);
};

closeButton.onclick = async () => {
  hangup();
  console.log('signalling sending bye');
  signaling.postMessage({type: 'bye'});
};

async function hangup() {
  if (user) {
    user.close();
    user = null;
  }
  sendChannel = null;
  receiveChannel = null;
  console.log('Closed peer connections');
  startButton.disabled = false;
  sendButton.disabled = true;
  closeButton.disabled = true;
  dataChannelSend.value = '';
  dataChannelReceive.value = '';
  dataChannelSend.disabled = true;
};

function createPeerConnection() {
  user = new RTCPeerConnection();
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
	console.log('signalling sending message type candidate');
    signaling.postMessage(message);
  };
}

async function handleOffer(offer) {
  if (user) {
    console.error('existing peerconnection');
    return;
  }
  await createPeerConnection();
  user.ondatachannel = receiveChannelCallback;
  await user.setRemoteDescription(offer);

  const answer = await user.createAnswer();
  console.log('signalling sending answerSDP');
  signaling.postMessage({type: 'answer', sdp: answer.sdp});
  await user.setLocalDescription(answer);
}

async function handleAnswer(answer) {
  console.log('handleAnswer');
  if (!user) {
    console.error('no peerconnection');
    return;
  }
  await user.setRemoteDescription(answer);
}

async function handleCandidate(candidate) {
  console.log('handleAnswer');
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

function sendData() {
  console.log('sendData');
  const data = dataChannelSend.value;
  
  if (sendChannel) {
	console.log('sending Data by sendChannel');
    sendChannel.send(data);
  } else {
	console.log('sending Data by receiveChannel');
    receiveChannel.send(data);
  }
  console.log('Sent Data: ' + data);
}

function receiveChannelCallback(event) {
  console.log('Receive Channel Callback');
  receiveChannel = event.channel;
  receiveChannel.onmessage = onReceiveChannelMessageCallback;
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;
}

function onReceiveChannelMessageCallback(event) {
  console.log('Received Message');
  dataChannelReceive.value = event.data;
}

function onSendChannelMessageCallback(event) {
  console.log('Received Message');
  dataChannelReceive.value = event.data;
}

function onSendChannelStateChange() {
  const readyState = sendChannel.readyState;
  console.log('Send channel state is: ' + readyState);
  if (readyState === 'open') {
    dataChannelSend.disabled = false;
    dataChannelSend.focus();
    sendButton.disabled = false;
    closeButton.disabled = false;
  } else {
    dataChannelSend.disabled = true;
    sendButton.disabled = true;
    closeButton.disabled = true;
  }
}

function onReceiveChannelStateChange() {
  const readyState = receiveChannel.readyState;
  console.log(`Receive channel state is: ${readyState}`);
  if (readyState === 'open') {
    dataChannelSend.disabled = false;
    sendButton.disabled = false;
    closeButton.disabled = false;
  } else {
    dataChannelSend.disabled = true;
    sendButton.disabled = true;
    closeButton.disabled = true;
  }
}
