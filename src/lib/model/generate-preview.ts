import * as THREE from 'three';
import { applyModelMaterial, disposeObjectResources, fitModelToOrigin } from './model-scene';

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.92);
  });
}

export async function generatePreviewImage(object: THREE.Object3D) {
  const previewObject = object.clone(true);
  applyModelMaterial(previewObject, '#f4f8fb');
  fitModelToOrigin(previewObject, 2.25);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(2.9, 2.25, 4.7);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(320, 320);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x111827, 1);

  scene.add(previewObject);
  scene.add(new THREE.HemisphereLight(0xf7fbff, 0x293241, 2.2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.8);
  keyLight.position.set(3.2, 5.4, 4.2);
  scene.add(keyLight);

  renderer.render(scene, camera);
  const blob = await canvasToPngBlob(renderer.domElement);

  renderer.dispose();
  disposeObjectResources(previewObject);

  return blob;
}
