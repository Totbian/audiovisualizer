import * as THREE from "three";
import { GUI } from "dat.gui";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
//renderer.setClearColor(0x222222);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

camera.position.set(0, -2, 14);
camera.lookAt(0, 0, 0);

const uniforms = {
  u_time: { type: "f", value: 0.0 },
  u_frequency: { type: "f", value: 0.0 },
  u_red: { type: "f", value: 0.376 },
  u_green: { type: "f", value: 0.121 },
  u_blue: { type: "f", value: 0.922 },
  u_colorMix: { type: "f", value: 0.0 },
};

const colors = [
  { r: 0.376, g: 0.121, b: 0.922 },
  { r: 0.922, g: 0.121, b: 0.376 },
  { r: 0.121, g: 0.922, b: 0.376 },
];

let currentColorIndex = 0;
let nextColorIndex = 1;
let colorTransitionProgress = 0;
const colorTransitionSpeed = 0.005;

const mat = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: document.getElementById("vertexshader").textContent,
  fragmentShader: document.getElementById("fragmentshader").textContent,
});

const geo = new THREE.IcosahedronGeometry(2.5, 15);
const mesh = new THREE.Mesh(geo, mat);
scene.add(mesh);
mesh.material.wireframe = true;

const listener = new THREE.AudioListener();
camera.add(listener);

const sound = new THREE.Audio(listener);

const audioLoader = new THREE.AudioLoader();

// Add idle animation state and default frequency
let isPlaying = false;
let animationFrameId = null;
const IDLE_FREQUENCY = 15; // Base frequency
const IDLE_FREQUENCY_VARIATION = 9; // Variation amount
const MIN_IDLE_FREQUENCY = 10; // Minimum frequency to ensure constant movement

// Add orbit controls after camera setup
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Add smooth damping
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.5; // Make rotation a bit gentler

function animate(isIdle = false) {
  // Enable/disable controls based on state
  controls.enabled = isIdle;

  colorTransitionProgress += colorTransitionSpeed;
  if (colorTransitionProgress >= 1) {
    colorTransitionProgress = 0;
    currentColorIndex = nextColorIndex;
    nextColorIndex = (nextColorIndex + 1) % colors.length;
  }

  const currentColor = colors[currentColorIndex];
  const nextColor = colors[nextColorIndex];

  uniforms.u_red.value = THREE.MathUtils.lerp(currentColor.r, nextColor.r, colorTransitionProgress);
  uniforms.u_green.value = THREE.MathUtils.lerp(currentColor.g, nextColor.g, colorTransitionProgress);
  uniforms.u_blue.value = THREE.MathUtils.lerp(currentColor.b, nextColor.b, colorTransitionProgress);

  uniforms.u_time.value = clock.getElapsedTime();

  if (isIdle) {
    const time = clock.getElapsedTime();
    const idleValue = Math.max(MIN_IDLE_FREQUENCY, IDLE_FREQUENCY + Math.sin(time) * IDLE_FREQUENCY_VARIATION);
    uniforms.u_frequency.value = idleValue;
    controls.update();
  } else {
    uniforms.u_frequency.value = analyser.getAverageFrequency();
  }

  uniforms.u_colorMix.value = colorTransitionProgress;

  renderer.render(scene, camera);
  animationFrameId = requestAnimationFrame(() => animate(isIdle));
}

audioLoader.load("./assets/call.mp3", function (buffer) {
  sound.setBuffer(buffer);

  // Add ended event listener to the sound
  sound.onEnded = function () {
    // Reset to idle state
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    animate(true);
    playButton.innerHTML = "▶️ Play";
    isPlaying = false;
  };

  const playButton = document.createElement("button");
  playButton.innerHTML = "▶️ Play";
  playButton.style.cssText = "position: fixed; top: 20px; left: 20px; z-index: 1000; padding: 10px; cursor: pointer;";
  document.body.appendChild(playButton);

  playButton.addEventListener("click", function () {
    if (!isPlaying) {
      sound.play();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      controls.enabled = false; // Disable controls when playing
      animate(false);
      playButton.innerHTML = "⏸️ Pause";
      isPlaying = true;
    } else {
      sound.pause();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      controls.enabled = true; // Enable controls when paused
      animate(true);
      playButton.innerHTML = "▶️ Play";
      isPlaying = false;
    }
  });

  // Start with idle animation
  animate(true);
});

const analyser = new THREE.AudioAnalyser(sound, 32);

const gui = new GUI();

const clock = new THREE.Clock();

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
