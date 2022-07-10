import React from "react";
import ReactDOM from "react-dom";

import * as CameraUtils from '@mediapipe/camera_utils/camera_utils';
import * as FaceMesh from '@mediapipe/face_mesh/face_mesh';
import { drawConnectors } from '@mediapipe/drawing_utils/drawing_utils';
import * as Kalidokit from 'kalidokit';
import * as PIXI from 'pixi';
import { Live2DModel } from 'pixi-live2d-display/lib/cubism4';

declare global {
  interface Window {
    PIXI: any;
  }
}

window.PIXI = PIXI;

interface AppState {
  camera: CameraUtils.Camera;
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
    };
  }

  async componentDidMount() {
    const videoElement = document.getElementById('input_video');
    const canvasElement = (document.getElementById('output_canvas') as HTMLCanvasElement)!;

    const pixiApp = new PIXI.Application({
      view: canvasElement,
      width: 500,
	    height: 500,
    });
    const model = await Live2DModel.from("https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json", { autoInteract: false });

    // faceMesh.onResults(onResult(videoElement, canvasCtx, canvasElement.width, canvasElement.height));
    pixiApp.stage.addChild(model)

    model.x = 250;
    model.y = 250;
    model.rotation = Math.PI;
    model.skew.x = Math.PI;
    model.scale.set(0.1);
    model.anchor.set(0.5, 0.5);

    const camera = new CameraUtils.Camera(videoElement, {
      onFrame: async () => {
        await faceMesh.send({ image: videoElement });
      },
      width: 1280,
      height: 720
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
          <canvas id="output_canvas"></canvas>
          <button onClick={this.onCamera}>Turn on</button>
      </>
    );
  }
}

