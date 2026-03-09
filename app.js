// ─── Etch A Sketch 3D ───────────────────────────────────────
// Minimal Three.js scene: 3D Etch A Sketch with a back panel
// showing embossed plastic product text. On serial connect the
// device flips around to reveal the drawing screen.

import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// ─── Globals ───
let scene, camera, renderer;
let etchGroup, bodyMesh, screenMesh, knobL, knobR;
let drawCanvas, drawCtx, drawTexture;
let port, reader, inputBuffer = '';
let isConnected = false;
let potX = 512, potY = 512;
let smoothX = 512, smoothY = 512;
let prevU = 0.5, prevV = 0.5;
let strokeColor = '#222222';
let strokeSize = 3;
let isClearing = false;
let clearAlpha = 0;

// Flip animation
let isFlipping = false;
let flipProgress = 0;
let targetRotY = Math.PI; // start showing the back
let currentRotY = Math.PI;

const TEX_W = 660, TEX_H = 480;
const bodyW = 3.6, bodyH = 2.8, bodyD = 0.35;

// ─── Init ───
init();
animate();

function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  // Lighting — HDRI environment map for photorealistic reflections
  new RGBELoader().load(
    'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr',
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture; // lights everything via HDRI
      // Keep white background — don't set scene.background to the HDRI
    }
  );

  // Subtle fill light as fallback while HDRI loads
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const softKey = new THREE.DirectionalLight(0xffffff, 0.6);
  softKey.position.set(2, 4, 5);
  scene.add(softKey);

  // Camera
  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.1, 5.5);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.id = 'threeCanvas';
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.body.appendChild(renderer.domElement);

  // Drawing canvas
  drawCanvas = document.createElement('canvas');
  drawCanvas.width = TEX_W;
  drawCanvas.height = TEX_H;
  drawCtx = drawCanvas.getContext('2d');
  drawCtx.fillStyle = '#e8e6e0';
  drawCtx.fillRect(0, 0, TEX_W, TEX_H);
  drawCtx.lineCap = 'round';
  drawCtx.lineJoin = 'round';

  drawTexture = new THREE.CanvasTexture(drawCanvas);
  drawTexture.minFilter = THREE.LinearFilter;
  drawTexture.colorSpace = THREE.SRGBColorSpace;

  // Build model
  buildEtchASketch();

  // Start showing back
  etchGroup.rotation.y = Math.PI;

  // Events
  window.addEventListener('resize', onResize);

  // ─── Click device to shake, hover screen for tooltip ───
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  renderer.domElement.addEventListener('click', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(etchGroup.children, true);
    if (hits.length > 0 && isConnected) {
      isClearing = true;
      clearAlpha = 0;
    }
  });

  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.textContent = 'shake';
  tooltip.style.cssText = `
    position:fixed; z-index:60; pointer-events:none;
    font-family:'Caveat',cursive; font-size:22px; font-weight:700;
    color:rgba(0,0,0,0.55); opacity:0; transition:opacity 0.2s;
    transform:translate(-50%,-120%);
  `;
  document.body.appendChild(tooltip);

  renderer.domElement.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects([screenMesh], false);
    if (hits.length > 0 && isConnected) {
      tooltip.style.opacity = '1';
      tooltip.style.left = e.clientX + 'px';
      tooltip.style.top = e.clientY + 'px';
      renderer.domElement.style.cursor = 'pointer';
    } else {
      tooltip.style.opacity = '0';
      // Still show pointer if hovering device at all
      const bodyHits = raycaster.intersectObjects(etchGroup.children, true);
      renderer.domElement.style.cursor = (bodyHits.length > 0 && isConnected) ? 'pointer' : 'default';
    }
  });
}

// ─── Build 3D model ───

function buildEtchASketch() {
  etchGroup = new THREE.Group();

  // Body
  const bodyGeo = createRoundedBox(bodyW, bodyH, bodyD, 0.15, 4);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xc1272d,
    roughness: 0.15,
    metalness: 0.08,
    envMapIntensity: 1.4,
  });
  bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  etchGroup.add(bodyMesh);

  // ─── FRONT SIDE ───

  // Front plate — beveled rounded shape for 3D depth
  const frameDepth = 0.08;
  const bevelThick = 0.06;
  const frameZ = bodyD / 2 + frameDepth / 2;
  const frontSurface = frameZ + frameDepth / 2 + bevelThick; // actual front after bevel
  const screenCenterY = 0.0;

  const frontPlateGeo = createBeveledFrontPlate(bodyW - 0.02, bodyH - 0.02, frameDepth, 0.15, 4);
  const frontPlateMat = new THREE.MeshStandardMaterial({
    color: 0xc1272d,
    roughness: 0.15,
    metalness: 0.08,
    envMapIntensity: 1.4,
  });
  const frontPlate = new THREE.Mesh(frontPlateGeo, frontPlateMat);
  frontPlate.position.set(0, 0, frameZ);
  etchGroup.add(frontPlate);

  // Screen — sits on top of the beveled front plate
  const screenW = 2.76, screenH = 1.82;
  const screenGeo = new THREE.PlaneGeometry(screenW, screenH);
  const screenMat = new THREE.MeshBasicMaterial({ map: drawTexture });
  screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.z = frontSurface + 0.002;
  screenMesh.position.y = screenCenterY;
  etchGroup.add(screenMesh);

  // Screen ridge / bevel — recessed frame around the screen
  const ridgeBorder = 0.06;
  const ridgeDepth = 0.025;
  const ridgeMat = new THREE.MeshStandardMaterial({
    color: 0xc1272d, roughness: 0.15, metalness: 0.08, envMapIntensity: 1.4,
  });
  const rZ = frontSurface - ridgeDepth / 2 + 0.002;

  // Top ridge
  const rTop = new THREE.Mesh(new THREE.BoxGeometry(screenW + ridgeBorder * 2, ridgeBorder, ridgeDepth), ridgeMat);
  rTop.position.set(0, screenCenterY + screenH / 2 + ridgeBorder / 2, rZ);
  etchGroup.add(rTop);
  // Bottom ridge
  const rBot = new THREE.Mesh(new THREE.BoxGeometry(screenW + ridgeBorder * 2, ridgeBorder, ridgeDepth), ridgeMat);
  rBot.position.set(0, screenCenterY - screenH / 2 - ridgeBorder / 2, rZ);
  etchGroup.add(rBot);
  // Left ridge
  const rLeft = new THREE.Mesh(new THREE.BoxGeometry(ridgeBorder, screenH + ridgeBorder * 2, ridgeDepth), ridgeMat);
  rLeft.position.set(-screenW / 2 - ridgeBorder / 2, screenCenterY, rZ);
  etchGroup.add(rLeft);
  // Right ridge
  const rRight = new THREE.Mesh(new THREE.BoxGeometry(ridgeBorder, screenH + ridgeBorder * 2, ridgeDepth), ridgeMat);
  rRight.position.set(screenW / 2 + ridgeBorder / 2, screenCenterY, rZ);
  etchGroup.add(rRight);

  // Front title: MAGIC · Etch A Sketch® · SCREEN
  const frontTitle = makeTextPlane(1024, 80, (ctx) => {
    const gold = '#d4a843';
    ctx.fillStyle = gold;
    ctx.textBaseline = 'middle';

    ctx.font = '600 22px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('MAGIC', 60, 42);

    ctx.font = 'italic 42px "Caveat", cursive';
    ctx.textAlign = 'center';
    ctx.fillText('Etch A Sketch', 512, 40);

    ctx.font = '600 20px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('®', 700, 24);

    ctx.font = '600 22px "Space Grotesk", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('SCREEN', 964, 42);
  }, 3.0, 0.22);
  const frontZ = frontSurface + 0.01; // in front of the beveled surface
  frontTitle.position.set(0, 1.22, frontZ);
  etchGroup.add(frontTitle);

  // Knobs
  knobL = createKnob();
  knobL.position.set(-1.45, -1.1, frontZ);
  etchGroup.add(knobL);

  knobR = createKnob();
  knobR.position.set(1.45, -1.1, frontZ);
  etchGroup.add(knobR);

  // ─── BACK SIDE ───
  buildBackPanel();

  // Slight tilt
  etchGroup.rotation.x = -0.06;
  scene.add(etchGroup);
}

// ─── Back panel with embossed plastic text ───

function buildBackPanel() {
  // Embossed text texture — molded plastic look
  const backCanvas = document.createElement('canvas');
  backCanvas.width = 1024;
  backCanvas.height = 768;
  const ctx = backCanvas.getContext('2d');

  // Base: match body red
  ctx.fillStyle = '#c1272d';
  ctx.fillRect(0, 0, 1024, 768);

  // Inner ridge — subtle recessed border like injection-molded plastic
  const ridge = 22;
  // Outer shadow edge (top-left catch light)
  ctx.strokeStyle = 'rgba(220, 80, 80, 0.5)';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(ridge, ridge, 1024 - ridge * 2, 768 - ridge * 2);
  // Inner shadow edge (bottom-right shadow)
  ctx.strokeStyle = 'rgba(60, 10, 10, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(ridge + 2, ridge + 2, 1024 - (ridge + 2) * 2, 768 - (ridge + 2) * 2);
  // Ridge highlight
  ctx.strokeStyle = 'rgba(200, 70, 70, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ridge + 4, ridge + 4, 1024 - (ridge + 4) * 2, 768 - (ridge + 4) * 2);

  // Injection-molded plastic emboss — very subtle, same-hue raised text
  const shadowColor = 'rgba(80, 15, 15, 0.4)';       // dark edge below text
  const surfaceColor = 'rgba(175, 50, 50, 0.6)';     // slightly lighter red surface
  const highlightColor = 'rgba(210, 80, 80, 0.3)';   // subtle top-edge catch light

  // Draw embossed text helper — mimics injection-molded plastic
  function embossText(text, x, y, font, align) {
    ctx.textAlign = align || 'center';
    ctx.font = font;
    // Bottom shadow (recessed edge)
    ctx.fillStyle = shadowColor;
    ctx.fillText(text, x + 0.5, y + 0.8);
    // Raised surface — very close to background color
    ctx.fillStyle = surfaceColor;
    ctx.fillText(text, x, y);
    // Top highlight — light catching the raised edge
    ctx.fillStyle = highlightColor;
    ctx.fillText(text, x - 0.2, y - 0.4);
  }

  // Title
  embossText('ETCH A SKETCH®', 512, 80, 'bold 38px "Space Grotesk", sans-serif', 'center');

  // Horizontal rule
  ctx.fillStyle = shadowColor;
  ctx.fillRect(120, 100, 784, 1);
  ctx.fillStyle = surfaceColor;
  ctx.fillRect(120, 101, 784, 1);

  // Project description
  const desc = [
    'MAGIC SCREEN® DRAWING TOY',
    '',
    '⚠ WARNING: CHOKING HAZARD',
    'Small parts. Not for children',
    'under 3 years.',
    '',
    'CONTENTS: Aluminum powder,',
    'plastic beads, ABS housing.',
    '',
    'CARE INSTRUCTIONS:',
    'Turn upside down and shake to',
    'erase. Do not submerge in water.',
    'Wipe clean with a damp cloth.',
    'Do not expose to extreme heat.',
  ];

  desc.forEach((line, i) => {
    const y = 150 + i * 34;
    const size = i === 0 ? '24px' : i === 1 ? '16px' : '15px';
    const weight = i < 2 ? '600' : '400';
    embossText(line, 512, y, `${weight} ${size} "IBM Plex Mono", monospace`, 'center');
  });

  // Small regulatory-style text at bottom
  const fine = [
    'U.S. PAT. NO. 3,060,806  •  OTHER PATS. PENDING',
    'MODEL NO. 505  |  ITEM 6012   MADE IN CHINA',
    '© THE OHIO ART COMPANY, BRYAN, OH 43506',
    'CONFORMS TO ASTM F963  •  CPSIA CERTIFIED',
  ];
  fine.forEach((line, i) => {
    embossText(line, 512, 640 + i * 20, '400 10px "IBM Plex Mono", monospace', 'center');
  });

  // Recycle / material codes
  embossText('♻ ABS', 900, 730, '400 13px sans-serif', 'right');
  embossText('△ 7', 140, 730, '400 13px sans-serif', 'left');
  embossText('CE', 512, 730, 'bold 14px sans-serif', 'center');

  // Create texture & material
  const backTex = new THREE.CanvasTexture(backCanvas);
  backTex.colorSpace = THREE.SRGBColorSpace;

  const textPlaneGeo = new THREE.PlaneGeometry(3.4, 2.55);
  const textPlaneMat = new THREE.MeshStandardMaterial({
    map: backTex,
    color: 0xffffff,
    roughness: 0.15,
    metalness: 0.08,
    envMapIntensity: 1.4,
    bumpMap: backTex,
    bumpScale: 0.012,
  });
  const textPlane = new THREE.Mesh(textPlaneGeo, textPlaneMat);
  textPlane.position.z = -(bodyD / 2 + 0.025);
  textPlane.rotation.y = Math.PI;
  etchGroup.add(textPlane);

  // Screw holes (4 corners)
  const screwGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12);
  const screwMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.3, metalness: 0.8 });
  [[-1.4, 1.0], [1.4, 1.0], [-1.4, -0.7], [1.4, -0.7]].forEach(([sx, sy]) => {
    const screw = new THREE.Mesh(screwGeo, screwMat);
    screw.rotation.x = Math.PI / 2;
    screw.position.set(sx, sy, -(bodyD / 2 + 0.03));
    etchGroup.add(screw);

    // Cross slot on screw
    const slotGeo = new THREE.BoxGeometry(0.05, 0.005, 0.025);
    const slotMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const slot1 = new THREE.Mesh(slotGeo, slotMat);
    slot1.position.set(sx, sy, -(bodyD / 2 + 0.04));
    etchGroup.add(slot1);
    const slot2 = slot1.clone();
    slot2.rotation.z = Math.PI / 2;
    slot2.position.copy(slot1.position);
    etchGroup.add(slot2);
  });
}

// ─── Helpers ───

function makeTextPlane(canvasW, canvasH, drawFn, planeW, planeH) {
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvasW, canvasH);
  drawFn(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(planeW, planeH);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    roughness: 0.25,
    metalness: 0.6,
    envMapIntensity: 2.0,
    color: 0xffffff,
  });
  return new THREE.Mesh(geo, mat);
}

function createKnob() {
  const group = new THREE.Group();
  const cylGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.12, 32);
  const cylMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.45, metalness: 0.0, envMapIntensity: 0.5 });
  const cyl = new THREE.Mesh(cylGeo, cylMat);
  cyl.rotation.x = Math.PI / 2;
  group.add(cyl);

  const ridgeCount = 24;
  for (let i = 0; i < ridgeCount; i++) {
    const angle = (i / ridgeCount) * Math.PI * 2;
    const ridgeGeo = new THREE.BoxGeometry(0.015, 0.11, 0.025);
    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.5, metalness: 0.0, envMapIntensity: 0.4 });
    const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
    ridge.position.x = Math.cos(angle) * 0.23;
    ridge.position.y = Math.sin(angle) * 0.23;
    ridge.rotation.z = angle;
    group.add(ridge);
  }

  const notchGeo = new THREE.BoxGeometry(0.03, 0.08, 0.02);
  const notchMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });
  const notch = new THREE.Mesh(notchGeo, notchMat);
  notch.position.set(0, 0.16, 0.06);
  group.add(notch);
  return group;
}

function createRoundedBox(w, h, d, r, segments) {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d, bevelEnabled: false,
  });
  geo.translate(0, 0, -d / 2);
  return geo;
}

function createBeveledFrontPlate(w, h, d, r, segments) {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelOffset: 0,
    bevelSegments: 5,
  });
  geo.translate(0, 0, -d / 2);
  return geo;
}

// ─── Animation loop ───

function animate() {
  requestAnimationFrame(animate);

  // ─── Flip animation ───
  if (isFlipping) {
    const diff = targetRotY - currentRotY;
    currentRotY += diff * 0.06;
    if (Math.abs(diff) < 0.005) {
      currentRotY = targetRotY;
      isFlipping = false;
    }
    etchGroup.rotation.y = currentRotY;
  }

  // Smooth pot values — slow lerp to absorb jitter
  smoothX += (potX - smoothX) * 0.06;
  smoothY += (potY - smoothY) * 0.06;

  // Clamp max movement per frame to prevent jumps
  const maxStep = 8; // max pixels per frame
  let cx = smoothX / 1023 * TEX_W;
  let cy = smoothY / 1023 * TEX_H;
  const px = prevU * TEX_W;
  const py = prevV * TEX_H;
  const dx = cx - px;
  const dy = cy - py;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > maxStep) {
    cx = px + (dx / dist) * maxStep;
    cy = py + (dy / dist) * maxStep;
  }
  const u = cx / TEX_W;
  const v = cy / TEX_H;

  // Draw
  if (isConnected && !isClearing) {
    if (dist > 0.3) {
      drawCtx.strokeStyle = strokeColor;
      drawCtx.lineWidth = strokeSize;
      drawCtx.lineCap = 'round';
      drawCtx.lineJoin = 'round';
      drawCtx.beginPath();
      drawCtx.moveTo(px, py);
      drawCtx.lineTo(cx, cy);
      drawCtx.stroke();
    }
    prevU = u;
    prevV = v;
  }

  // Clear animation
  if (isClearing) {
    clearAlpha += 0.02;
    drawCtx.fillStyle = `rgba(232, 230, 224, ${Math.min(clearAlpha, 0.15)})`;
    drawCtx.fillRect(0, 0, TEX_W, TEX_H);
    if (clearAlpha >= 1) {
      drawCtx.fillStyle = '#e8e6e0';
      drawCtx.fillRect(0, 0, TEX_W, TEX_H);
      isClearing = false;
      clearAlpha = 0;
      if (etchGroup) etchGroup.rotation.z = 0;
    } else if (etchGroup) {
      etchGroup.rotation.z = Math.sin(clearAlpha * 40) * 0.04 * (1 - clearAlpha);
    }
  }

  drawTexture.needsUpdate = true;

  // Knobs
  if (knobL) knobL.rotation.z = ((smoothX / 1023) - 0.5) * Math.PI * 2;
  if (knobR) knobR.rotation.z = ((smoothY / 1023) - 0.5) * Math.PI * 2;

  renderer.render(scene, camera);
}

// ─── Flip control ───

function flipToFront() {
  targetRotY = 0;
  isFlipping = true;
}

function flipToBack() {
  targetRotY = Math.PI;
  isFlipping = true;
}

// ─── Serial ───

async function connectSerial() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    isConnected = true;

    // Flip to front!
    flipToFront();

    // Hide bouncing text
    window.dispatchEvent(new Event('serial-connected'));

    setTimeout(() => {
      prevU = smoothX / 1023;
      prevV = smoothY / 1023;
    }, 200);

    readSerial();
  } catch (err) {
    console.error('Connection error:', err);
  }
}
// Expose for HTML click handler
window.connectSerial = connectSerial;

async function readSerial() {
  const decoder = new TextDecoderStream();
  port.readable.pipeTo(decoder.writable);
  reader = decoder.readable.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        inputBuffer += value;
        let lines = inputBuffer.split('\n');
        inputBuffer = lines.pop();
        for (let line of lines) {
          line = line.trim();
          if (line.includes(',')) {
            const parts = line.split(',');
            const x = parseInt(parts[0]);
            const y = parseInt(parts[1]);
            if (!isNaN(x) && !isNaN(y) && x >= 0 && x <= 1023 && y >= 0 && y <= 1023) {
              potX = x;
              potY = y;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Read error:', err);
  }
}

async function disconnectSerial() {
  try {
    isConnected = false;
    if (reader) { await reader.cancel(); reader = null; }
    if (port) { await port.close(); port = null; }

    // Flip back to show the back panel
    flipToBack();
  } catch (err) {
    console.error('Disconnect error:', err);
  }
}

// ─── Resize ───

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('beforeunload', () => {
  if (isConnected) disconnectSerial();
});
