// The sun's shadows, as the game's directional light casts them: the place drawn once more from the sun into a depth
// map, cut out the same way as the art (pixel.ts caster), which the pixel shader reads at the centre of each art
// pixel so the shadows' edges stay on the pixel grid. Lights cast none.
import * as THREE from 'three';
import { shared } from './pixel';

export class Sun {
  private readonly target: THREE.WebGLRenderTarget;
  private readonly cam = new THREE.OrthographicCamera();
  private readonly casters: [THREE.Mesh, THREE.ShaderMaterial][] = [];
  private readonly hidden: THREE.Object3D[] = [];

  constructor(size: number) {
    this.target = new THREE.WebGLRenderTarget(size, size, {
      depthTexture: new THREE.DepthTexture(size, size, THREE.UnsignedIntType),
      depthBuffer: true,
    });
    this.target.depthTexture!.magFilter = this.target.depthTexture!.minFilter = THREE.NearestFilter;
    shared.uSunMap.value = this.target.depthTexture;
  }

  /** What casts shadows, each with its caster material; and what never does (lights). */
  add(casters: [THREE.Mesh, THREE.ShaderMaterial][], hidden: THREE.Object3D[] = []) {
    this.casters.push(...casters);
    this.hidden.push(...hidden);
  }

  /** Draws the shadow map for the sun toward dir, over a box of radius r round centre (world). */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, dir: THREE.Vector3, centre: THREE.Vector3, r: number) {
    const c = this.cam;
    c.left = c.bottom = -r;
    c.right = c.top = r;
    c.near = 0;
    c.far = r * 4;
    c.position.copy(centre).addScaledVector(dir, r * 2);
    c.up.set(0, 0, -1);
    c.lookAt(centre);
    c.updateProjectionMatrix();
    c.updateMatrixWorld();
    shared.uSunMatrix.value.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse);
    const was = this.casters.map(([m]) => m.material);
    const shown = this.hidden.map(o => o.visible);
    this.casters.forEach(([m, mat]) => (m.material = mat));
    this.hidden.forEach(o => (o.visible = false));
    const bg = scene.background;
    scene.background = null;
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(scene, c);
    renderer.setRenderTarget(null);
    scene.background = bg;
    this.casters.forEach(([m], i) => (m.material = was[i]!));
    this.hidden.forEach((o, i) => (o.visible = shown[i]!));
    shared.uSunOn.value = 1;
  }
}
