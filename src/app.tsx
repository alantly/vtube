import React from "react";
import ReactDOM from "react-dom";

import * as CameraUtils from '@mediapipe/camera_utils/camera_utils';
import * as FaceMesh from '@mediapipe/face_mesh/face_mesh';
import { drawConnectors } from '@mediapipe/drawing_utils/drawing_utils';
import * as Kalidokit from 'kalidokit';

interface AppState {
  camera: CameraUtils.Camera;
  on: boolean;
}

function onResult(videoElement, canvasCtx, width, height) {
  return (results) => {

    const facelm = results.multiFaceLandmarks[0];
    //const faceRig = Kalidokit.Face.solve(facelm,{ runtime:'mediapipe', video: videoElement })

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, width, height);
    canvasCtx.drawImage(
      results.image, 0, 0, width, height);
    if (results.multiFaceLandmarks) {
      for (const landmarks of results.multiFaceLandmarks) {
        drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_TESSELATION,
                       {color: '#C0C0C070', lineWidth: 1});
        drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_RIGHT_EYE, {color: '#FF3030'});
        drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_RIGHT_EYEBROW, {color: '#FF3030'});
        drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_RIGHT_IRIS, {color: '#FF3030'});
        drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_LEFT_EYE, {color: '#30FF30'});
        drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_LEFT_EYEBROW, {color: '#30FF30'});
        drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_LEFT_IRIS, {color: '#30FF30'});
        drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_FACE_OVAL, {color: '#E0E0E0'});
        drawConnectors(canvasCtx, landmarks, FaceMesh.FACEMESH_LIPS, {color: '#E0E0E0'});
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
      on: false,
    };
  }

  componentDidMount() {
    const videoElement = document.getElementById('input_video');
    const canvasElement = (document.getElementById('output_canvas') as HTMLCanvasElement)!;
    const canvasCtx = canvasElement.getContext('2d');

    faceMesh.onResults(onResult(videoElement, canvasCtx, canvasElement.width, canvasElement.height));

    const camera = new CameraUtils.Camera(videoElement, {
      onFrame: async () => {
        await faceMesh.send({ image: videoElement });
      },
      width: 1280,
      height: 720
    });

    this.setState({ camera })
  }

  onToggle = () => {
    if (this.state.on) {
      this.setState({ on: false })
    } else {
      this.setState({ on: true })
    }
  }

  onCamera = () => {
    this.state.camera.start();
  }

  render() {
    return (
      <>
          <video id="input_video"></video>
          <canvas id="output_canvas" width="1280px" height="720px"></canvas>
          <button onClick={this.onCamera}>Turn on</button>
          <button onClick={this.onToggle}>Toggle</button>
      </>
    );
  }
}

