import React from "react";
import ReactDOM from "react-dom";

import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
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


/* function onResult(effectRenderer) {
 *   return (results) => {
 *     effectRenderer.render(results);
 *   }
 * }
 * 
 *  */
class EffectRenderer {
  VIDEO_DEPTH = 500;
  FOV_DEGREES = 63;
  NEAR = 1;
  FAR = 10000;

  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  faceGroup: THREE.Group;
  canvasElement: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;

  constructor(canvasElement) {
    this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 10 );
    this.camera.position.z = 1;
    this.canvasElement = canvasElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa9a9a9);

    this.renderer = new THREE.WebGLRenderer({canvas: canvasElement});
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    hemiLight.position.set(0, 100, 0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(-30, 100, -5);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    this.faceGroup = new THREE.Group();
    this.faceGroup.matrixAutoUpdate = false;
    this.scene.add(this.faceGroup);

    const loader = new GLTFLoader();
    loader.setPath('https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/');
    loader.load('DamagedHelmet.gltf', (gltf) => {
      const scene = gltf.scene;
      scene.scale.set(18, 18, 18);

      this.faceGroup.add(gltf.scene);
    });
  }

  render(results: FaceMesh.Results) {
    this.onCanvasDimsUpdate();

    const imagePlane = this.createGpuBufferPlane(results.image);
    this.scene.add(imagePlane);

    if (results.multiFaceGeometry.length > 0) {
      const faceGeometry = results.multiFaceGeometry[0];
      const poseTransformMatrixData = faceGeometry.getPoseTransformMatrix();

      this.faceGroup.matrix.fromArray(poseTransformMatrixData.getPackedDataList());
      this.faceGroup.visible = true;
    } else {
      this.faceGroup.visible = false;
    }

    this.renderer.render(this.scene, this.camera);

    this.scene.remove(imagePlane);
  }

  private createGpuBufferPlane(gpuBuffer: FaceMesh.GpuBuffer): THREE.Mesh {
    const depth = this.VIDEO_DEPTH;
    const fov = this.camera.fov;

    const width = this.canvasElement.width;
    const height = this.canvasElement.height;
    const aspect = width / height;

    const viewportHeightAtDepth =
      2 * depth * Math.tan(THREE.MathUtils.degToRad(0.5 * fov));
    const viewportWidthAtDepth = viewportHeightAtDepth * aspect;

    const texture = new THREE.CanvasTexture(gpuBuffer as HTMLCanvasElement);
    texture.minFilter = THREE.LinearFilter;
    texture.encoding = THREE.sRGBEncoding;

    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({map: texture})
    );

    plane.scale.set(viewportWidthAtDepth, viewportHeightAtDepth, 1);
    plane.position.set(0, 0, -depth);

    return plane;
  }

  private onCanvasDimsUpdate() {
    this.camera = new THREE.PerspectiveCamera(
        this.FOV_DEGREES,
        this.canvasElement.width / this.canvasElement.height,
        this.NEAR,
        this.FAR);

    this.renderer.setSize(this.canvasElement.width, this.canvasElement.height);
  }
};


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

    // const effectRenderer = new EffectRenderer(canvasElement);
    // faceMesh.onResults(onResult(effectRenderer));
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
