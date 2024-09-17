'use strict';

const startButton = document.getElementById('startButton');
const hangupButton = document.getElementById('hangupButton');
hangupButton.disabled = true;

// streaming video (video: true).
// to stream audio also add constraint (audio: true)
const mediaStreamConstraints = {
  video: true,
  audio: true
};

// Video element where stream will be placed.
const localVideo = document.querySelector('video');

// Local stream that will be reproduced on the video.
let localStream;

console.log('WebRTC Deepdive ');
console.log('Example: getUserMedia Audio/Video capture');

// Handles success by adding the MediaStream to the video element.
function gotLocalMediaStream(mediaStream) {
  const audioTracks = mediaStream.getAudioTracks();
  console.log('Using audio device: ' + audioTracks[0].label);
  const videoTracks = mediaStream.getVideoTracks();
  console.log('Using video device: ' + videoTracks[0].label);
  console.log('media stream is ', mediaStream);
  localStream = mediaStream;
  localVideo.srcObject = mediaStream;
}

// Handles error by logging a message to the console with the error message.
function handleLocalMediaStreamError(error) {
  console.log('navigator.getUserMedia error: ', error);
}

startButton.onclick = async () => {
  console.log("starting capture");
  startButton.disabled = true;
  hangupButton.disabled = false;
  
  // Capture stream from devices
  navigator.mediaDevices.getUserMedia(mediaStreamConstraints).then(gotLocalMediaStream).catch(handleLocalMediaStreamError);
};

hangupButton.onclick = async () => {
  console.log("ending capture");
  localStream.getTracks().forEach(track => track.stop());
  localStream = null;
  startButton.disabled = false;
  hangupButton.disabled = true;
};
