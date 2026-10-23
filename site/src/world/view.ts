// The view onto Bellwood, as the game's Core/Main.cs frames it: a perspective camera looking down at PITCH degrees
// with a 42 degree field of view, standing back so each art pixel covers `zoom` CSS pixels at the point it looks at.
import * as THREE from 'three';
import { BACK, PITCH, STRETCH, world } from './space';

THREE.ColorManagement.enabled = false;

export const FOV = 42;

export class View {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 1, 6000);
  /** CSS pixels per art pixel where the camera looks. */
  zoom = 3;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.camera.rotation.x = (-PITCH * Math.PI) / 180;
    this.resize();
  }

  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Looks at art point (x, row) on ground h px high. */
  look(x: number, row: number, h: number) {
    const distance = this.canvas.clientHeight / (2 * this.zoom) / Math.tan((FOV * Math.PI) / 360);
    const at = new THREE.Vector3(...world(x, row, h)).multiply(STRETCH);
    this.camera.position.copy(at).addScaledVector(BACK, distance);
    this.camera.updateMatrixWorld();
    return distance;
  }
}
