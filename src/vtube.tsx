import React from "react";
import ReactDOM from "react-dom";

import * as CameraUtils from '@mediapipe/camera_utils/camera_utils';
import * as FaceMesh from '@mediapipe/face_mesh/face_mesh';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils/drawing_utils';
import * as Kalidokit from 'kalidokit';
import * as PIXI from 'pixi';
import { Live2DModel } from 'pixi-live2d-display/lib/cubism4';


const lerp = Kalidokit.Vector.lerp;
const clamp = Kalidokit.Utils.clamp;

declare global {
  interface Window {
    PIXI: any;
  }
}

window.PIXI = PIXI;

interface AppState {
  camera: CameraUtils.Camera;
}

const drawResults = (videoElement, guideCanvas, points) => {
  if (!guideCanvas || !videoElement || !points) return;
  guideCanvas.width = videoElement.videoWidth;
  guideCanvas.height = videoElement.videoHeight;
  let canvasCtx = guideCanvas.getContext("2d");
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
  // Use `Mediapipe` drawing functions
  drawConnectors(canvasCtx, points, FaceMesh.FACEMESH_TESSELATION, {
    color: "#C0C0C070",
    lineWidth: 1
  });
  if (points && points.length === 478) {
    //draw pupils
    drawLandmarks(canvasCtx, [points[468], points[468 + 5]], {
      color: "#ffe603",
      lineWidth: 2
    });
  }
};

const animateLive2DModel = (currentModel, videoElement, points) => {
  if (!currentModel || !points) return;

  let riggedFace;

  if (points) {
    riggedFace = Kalidokit.Face.solve(points, {
      runtime: "mediapipe",
      video: videoElement
    });
    rigFace(currentModel, riggedFace, 0.5);
  }
};

// update live2d model internal state
const rigFace = (currentModel, result, lerpAmount = 0.7) => {
  if (!currentModel || !result) return;
  const updateFn = currentModel.internalModel.motionManager.update;
  const coreModel = currentModel.internalModel.coreModel;

  currentModel.internalModel.motionManager.update = (...args) => {
    // disable default blink animation
    currentModel.internalModel.eyeBlink = undefined;

    coreModel.setParameterValueById(
      "ParamEyeBallX",
      lerp(
        result.pupil.x,
        coreModel.getParameterValueById("ParamEyeBallX"),
        lerpAmount
      )
    );
    coreModel.setParameterValueById(
      "ParamEyeBallY",
      lerp(
        result.pupil.y,
        coreModel.getParameterValueById("ParamEyeBallY"),
        lerpAmount
      )
    );

    // X and Y axis rotations are swapped for Live2D parameters
    // because it is a 2D system and KalidoKit is a 3D system
    coreModel.setParameterValueById(
      "ParamAngleX",
      lerp(
        result.head.degrees.y,
        coreModel.getParameterValueById("ParamAngleX"),
        lerpAmount
      )
    );
    coreModel.setParameterValueById(
      "ParamAngleY",
      lerp(
        result.head.degrees.x,
        coreModel.getParameterValueById("ParamAngleY"),
        lerpAmount
      )
    );
    coreModel.setParameterValueById(
      "ParamAngleZ",
      lerp(
        result.head.degrees.z,
        coreModel.getParameterValueById("ParamAngleZ"),
        lerpAmount
      )
    );

    // update body params for models without head/body param sync
    const dampener = 0.3;
    coreModel.setParameterValueById(
      "ParamBodyAngleX",
      lerp(
        result.head.degrees.y * dampener,
        coreModel.getParameterValueById("ParamBodyAngleX"),
        lerpAmount
      )
    );
    coreModel.setParameterValueById(
      "ParamBodyAngleY",
      lerp(
        result.head.degrees.x * dampener,
        coreModel.getParameterValueById("ParamBodyAngleY"),
        lerpAmount
      )
    );
    coreModel.setParameterValueById(
      "ParamBodyAngleZ",
      lerp(
        result.head.degrees.z * dampener,
        coreModel.getParameterValueById("ParamBodyAngleZ"),
        lerpAmount
      )
    );

    // Simple example without winking.
    // Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
    let stabilizedEyes = Kalidokit.Face.stabilizeBlink(
      {
        l: lerp(
          result.eye.l,
          coreModel.getParameterValueById("ParamEyeLOpen"),
          0.7
        ),
        r: lerp(
          result.eye.r,
          coreModel.getParameterValueById("ParamEyeROpen"),
          0.7
        )
      },
      result.head.y
    );
    // eye blink
    coreModel.setParameterValueById("ParamEyeLOpen", stabilizedEyes.l);
    coreModel.setParameterValueById("ParamEyeROpen", stabilizedEyes.r);

    // mouth
    coreModel.setParameterValueById(
      "ParamMouthA",
      lerp(
        result.mouth.shape.A,
        coreModel.getParameterValueById("ParamMouthA"),
        0.3
      )
    );
    coreModel.setParameterValueById(
      "ParamMouthA",
      lerp(
        result.mouth.shape.A,
        coreModel.getParameterValueById("ParamMouthA"),
        0.3
      )
    );
    coreModel.setParameterValueById(
      "ParamMouthE",
      lerp(
        result.mouth.shape.E,
        coreModel.getParameterValueById("ParamMouthE"),
        0.3
      )
    );
    coreModel.setParameterValueById(
      "ParamMouthI",
      lerp(
        result.mouth.shape.I,
        coreModel.getParameterValueById("ParamMouthI"),
        0.3
      )
    );
    coreModel.setParameterValueById(
      "ParamMouthO",
      lerp(
        result.mouth.shape.O,
        coreModel.getParameterValueById("ParamMouthO"),
        0.3
      )
    );
    coreModel.setParameterValueById(
      "ParamMouthU",
      lerp(
        result.mouth.shape.U,
        coreModel.getParameterValueById("ParamMouthU"),
        0.3
      )
    );
  };
};

function onResult(videoElement, faceCanvas, currentModel) {
  return (results) => {
    drawResults(videoElement, faceCanvas, results.multiFaceLandmarks[0])
    animateLive2DModel(currentModel, videoElement, results.multiFaceLandmarks[0]);
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
    const faceCanvasElement = (document.getElementById('face_canvas') as HTMLCanvasElement)!;
    const canvasElement = (document.getElementById('output_canvas') as HTMLCanvasElement)!;

    const pixiApp = new PIXI.Application({
      view: canvasElement,
      width: 500,
	    height: 500,
    });
    const model = await Live2DModel.from("mao_pro_en/runtime/mao_pro_t01.model3.json", { autoInteract: false });

    pixiApp.stage.addChild(model)

    model.x = 250;
    model.y = 500;
    model.rotation = Math.PI;
    model.skew.x = Math.PI;
    model.scale.set(0.1);
    model.anchor.set(0.5, 0.5);

    faceMesh.onResults(onResult(videoElement, faceCanvasElement, model));

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
          <canvas id="face_canvas"></canvas>
          <canvas id="output_canvas"></canvas>
          <button onClick={this.onCamera}>Turn on</button>
      </>
    );
  }
}

