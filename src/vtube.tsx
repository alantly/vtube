import React from "react";
import ReactDOM from "react-dom";

import * as CameraUtils from '@mediapipe/camera_utils/camera_utils';
import * as FaceMesh from '@mediapipe/face_mesh/face_mesh';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils/drawing_utils';


interface AppState {
  camera: CameraUtils.Camera;
}


function onResult(canvasElement, canvasCtx) {
  return (results) => {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    if (results.multiFaceLandmarks) {
      for (const landmarks of results.multiFaceLandmarks) {
        drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_TESSELATION, {color: '#C0C0C070', lineWidth: 1});
        drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_RIGHT_EYE, {color: '#FF3030'});
        drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_RIGHT_EYEBROW, {color: '#FF3030'});
        drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_RIGHT_IRIS, {color: '#FF3030'});
        drawConnectors(canvasCtx, landmarks,FaceMesh.FACEMESH_LEFT_EYE, {color: '#30FF30'});
        drawConnectors(canvasCtx, landmarks,FaceMesh.FACEMESH_LEFT_EYEBROW, {color: '#30FF30'});
        drawConnectors(canvasCtx, landmarks,FaceMesh.FACEMESH_LEFT_IRIS, {color: '#30FF30'});
        drawConnectors(canvasCtx, landmarks,FaceMesh.FACEMESH_FACE_OVAL, {color: '#E0E0E0'});
        drawConnectors(canvasCtx, landmarks,FaceMesh.FACEMESH_LIPS, {color: '#E0E0E0'});
      }
    }
    canvasCtx.restore();
  }
}

const faceMesh = new FaceMesh.FaceMesh({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
}});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

export default class App extends React.Component<{}, AppState> {
  constructor(props) {
    super(props);
    this.state = {
      camera: null,
    };
  }

  async componentDidMount() {
    const videoElement = document.getElementById('input_video');
    const canvasElement = (document.getElementById('output_canvas') as HTMLCanvasElement)!;
    const canvasCtx = canvasElement.getContext('2d');

    faceMesh.onResults(onResult(canvasElement, canvasCtx));

    const camera = new CameraUtils.Camera(videoElement, {
      onFrame: async () => {
        await faceMesh.send({ image: videoElement });
      },
      width: 500,
      height: 500
    });

    this.setState({ camera })
  }

  onCamera = () => {
    this.state.camera.start();
  }

  render() {
    return (
      <>
          <video id="input_video"></video>
          <canvas width="500px" height="500px" id="output_canvas"></canvas>
          <button onClick={this.onCamera}>Turn on</button>
      </>
    );
  }
}

