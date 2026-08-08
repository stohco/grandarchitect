/**
 * Filmic Grade — in-renderer vignette + saturation + warmth lift.
 *
 * The DOM CSS grade never reaches captured canvas pixels; this ShaderPass
 * bakes the grade INTO the render so the style gauntlet critic and the
 * evidence frames see exactly what the player sees. Deterministic.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export interface FilmicGradeOptions {
  vignette?: number;   // 0..1
  saturation?: number; // 1 = neutral
  warmth?: number;     // 0..1 lift of warm end
}

const GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uVignette: { value: 0.3 },
    uSaturation: { value: 1.05 },
    uWarmth: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform float uSaturation;
    uniform float uWarmth;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(lum), c.rgb, uSaturation);
      c.rgb += uWarmth * vec3(0.02, 0.008, -0.02); // gentle warm lift
      float d = distance(vUv, vec2(0.5));
      c.rgb *= 1.0 - uVignette * smoothstep(0.55, 0.95, d);
      gl_FragColor = c;
    }
  `,
};

export interface FilmicGrade {
  composer: EffectComposer;
  dispose: () => void;
}

/** Attach the grade. Call composer.render() instead of renderer.render(). */
export function attachFilmicGrade(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  opts?: FilmicGradeOptions,
): FilmicGrade {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const grade = new ShaderPass(GRADE_SHADER);
  grade.uniforms.uVignette.value = opts?.vignette ?? 0.3;
  grade.uniforms.uSaturation.value = opts?.saturation ?? 1.05;
  grade.uniforms.uWarmth.value = opts?.warmth ?? 0.35;
  composer.addPass(grade);
  return {
    composer,
    dispose: () => {
      composer.dispose();
    },
  };
}
