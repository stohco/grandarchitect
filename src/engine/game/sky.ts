/**
 * game/sky.ts — the living sky, driven by LOCAL solar time.
 *
 * The art bible palette (§2 of ART_DIRECTION.md): day zenith #B9CEDD →
 * horizon #DDE5EB; ember dusk; moonlit night. The shader takes the local
 * time of day and the local sun direction; the terminator is made visible
 * in the sky — dawn, noon, dusk and night are where the clock says they
 * are, and a fast flier crossing longitudes sees the sky change.
 *
 * Everything is deterministic: same local time → same sky, every run.
 */

import * as THREE from 'three';

/** Art-bible day zenith/horizon in LINEAR working space. */
const DAY_TOP = new THREE.Color(0.49, 0.62, 0.73);   // #B9CEDD
const DAY_HOR = new THREE.Color(0.73, 0.79, 0.83);   // #DDE5EB
const DUSK_TOP = new THREE.Color(0.05, 0.08, 0.18);
const DUSK_HOR = new THREE.Color(0.72, 0.28, 0.10);  // ember
const NIGHT_TOP = new THREE.Color(0.008, 0.012, 0.03);
const NIGHT_HOR = new THREE.Color(0.03, 0.045, 0.09);

export class SkyDome {
  readonly dome: THREE.Mesh;
  readonly stars: THREE.Points;
  readonly moon: THREE.Mesh;
  private uniforms: Record<string, THREE.IUniform>;

  constructor(scene: THREE.Scene) {
    this.uniforms = {
      uTime: { value: 0.5 },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uDayTop: { value: DAY_TOP.clone() },
      uDayHor: { value: DAY_HOR.clone() },
      uDuskTop: { value: DUSK_TOP.clone() },
      uDuskHor: { value: DUSK_HOR.clone() },
      uNightTop: { value: NIGHT_TOP.clone() },
      uNightHor: { value: NIGHT_HOR.clone() },
    };

    const geo = new THREE.SphereGeometry(4000, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: this.uniforms,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uSunDir;
        uniform vec3 uDayTop;
        uniform vec3 uDayHor;
        uniform vec3 uDuskTop;
        uniform vec3 uDuskHor;
        uniform vec3 uNightTop;
        uniform vec3 uNightHor;
        varying vec3 vDir;
        void main() {
          vec3 dir = normalize(vDir);
          float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
          float e = uSunDir.y; // sun elevation

          // day / dusk / night factors from the sun elevation
          float dayF = smoothstep(-0.05, 0.30, e);
          float nightF = 1.0 - smoothstep(-0.18, -0.04, e);
          float duskF = exp(-e * e * 120.0) * (1.0 - dayF * 0.55);

          vec3 top = mix(uNightTop, uDayTop, dayF);
          vec3 hor = mix(uNightHor, uDayHor, dayF);
          // ember dusk washes both bands
          top = mix(top, uDuskTop, duskF * 0.85);
          hor = mix(hor, uDuskHor, duskF);

          vec3 col = mix(hor, top, pow(h, 1.6));

          // the sun disc + corona
          float sd = dot(dir, normalize(uSunDir));
          float disc = smoothstep(0.9992, 0.9998, sd);
          float corona = exp(-(1.0 - sd) * 260.0);
          vec3 sunColor = vec3(1.0, 0.85, 0.6);
          col += sunColor * (disc * 6.0 + corona * 0.30) * (dayF * 0.85 + duskF * 0.5);

          // the moon's pale disc on the night side (opposite the sun)
          float md = dot(dir, -normalize(uSunDir));
          float moonDisc = smoothstep(0.9992, 0.9997, md);
          col += vec3(0.82, 0.86, 0.92) * moonDisc * 2.2 * nightF;

          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.dome = new THREE.Mesh(geo, mat);
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -3;
    scene.add(this.dome);

    // deterministic star field on the night dome
    const starPos: number[] = [];
    for (let i = 0; i < 400; i++) {
      const a = ((i * 2654435761) % 1000) / 1000 * Math.PI * 2;
      const b = Math.acos(2 * (((i * 40503) % 1000) / 1000) - 1);
      const r = 3950;
      starPos.push(Math.sin(b) * Math.cos(a) * r, Math.cos(b) * r, Math.sin(b) * Math.sin(a) * r);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xdfe8f2, size: 2.2, transparent: true, opacity: 0,
      sizeAttenuation: false, depthWrite: false,
    });
    this.stars = new THREE.Points(starGeo, starMat);
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -2;
    scene.add(this.stars);

    // the moon: a pale disc on the night side
    const moonGeo = new THREE.CircleGeometry(60, 24);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xdfe8f0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    this.moon = new THREE.Mesh(moonGeo, moonMat);
    this.moon.frustumCulled = false;
    this.moon.renderOrder = -2;
    scene.add(this.moon);
  }

  /** Drive the sky from LOCAL solar time and the local sun direction. */
  update(localTime: number, sunDir: { x: number; y: number; z: number }): void {
    this.uniforms.uTime.value = localTime;
    (this.uniforms.uSunDir.value as THREE.Vector3).set(sunDir.x, sunDir.y, sunDir.z);
    const nightF = 1 - THREE.MathUtils.smoothstep(sunDir.y, -0.04, 0.18);
    (this.stars.material as THREE.PointsMaterial).opacity = nightF;
    (this.moon.material as THREE.MeshBasicMaterial).opacity = nightF * 0.9;
    const md = { x: -sunDir.x, y: -sunDir.y, z: -sunDir.z };
    const len = Math.hypot(md.x, md.y, md.z) || 1;
    this.moon.position.set((md.x / len) * 3950, Math.max(0.05, (md.y / len)) * 3950, (md.z / len) * 3950);
    this.moon.lookAt(0, 0, 0);
  }

  /** The fog color matching the sky's horizon band at this time. */
  fogColor(localTime: number, sunElevation: number): THREE.Color {
    const dayF = THREE.MathUtils.smoothstep(sunElevation, -0.05, 0.30);
    const duskF = Math.exp(-sunElevation * sunElevation * 120) * (1 - dayF * 0.55);
    const hor = NIGHT_HOR.clone().lerp(DAY_HOR, dayF);
    return hor.lerp(DUSK_HOR, duskF);
  }
}
