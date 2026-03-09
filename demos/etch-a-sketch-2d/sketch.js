// Etch A Sketch — Two-pot Web Serial drawing tool

let port, reader, inputBuffer = '';
let isConnected = false;

// Drawing state
let potX = 512, potY = 512;
let smoothX = 512, smoothY = 512;
let prevDrawX, prevDrawY;
let drawingLayer;

// Settings
let strokeColor = '#333333';
let strokeSize = 3;
let isClearing = false;
let clearProgress = 0;

// ─── Model themes ───
const models = {
  classic: { body: '#fff',     border: 'rgba(0,0,0,0.06)', knob: 'gold',   themed: false, title: 'gold' },
  red:     { body: '#c1272d',  border: 'rgba(0,0,0,0.1)',  knob: 'silver', themed: true,  title: 'white' },
  blue:    { body: '#1a4d8f',  border: 'rgba(0,0,0,0.1)',  knob: 'silver', themed: true,  title: 'white' },
  pink:    { body: '#e8739a',  border: 'rgba(0,0,0,0.05)', knob: 'white-k',themed: true,  title: 'white' },
  black:   { body: '#1a1a1a',  border: 'rgba(255,255,255,0.05)', knob: 'silver', themed: true, title: 'gold' },
  green:   { body: '#2d6b4a',  border: 'rgba(0,0,0,0.1)',  knob: 'gold',   themed: true,  title: 'white' },
};

// Gallery captions — random each time
const captions = [
  "What a beautiful work of art.\nIt's time to hang this on the wall.",
  "Magnificent. The curator is speechless.",
  "A true masterpiece.\nSomebody call the Louvre.",
  "This belongs in a museum.\nNo, seriously.",
  "Exquisite line work.\nThe knobs have spoken.",
  "Breathtaking.\nThe fridge is not worthy — this needs a wall.",
  "Pure genius.\nThe potentiometers are proud of you.",
];

function setup() {
  let canvas = createCanvas(660, 480);
  canvas.parent('canvas-container');

  drawingLayer = createGraphics(660, 480);
  drawingLayer.background(240, 240, 238);
  drawingLayer.strokeCap(ROUND);
  drawingLayer.strokeJoin(ROUND);

  prevDrawX = width / 2;
  prevDrawY = height / 2;

  // Buttons
  document.getElementById('connectBtn').addEventListener('click', connectSerial);
  document.getElementById('disconnectBtn').addEventListener('click', disconnectSerial);
  document.getElementById('clearBtn').addEventListener('click', clearScreen);
  document.getElementById('displayBtn').addEventListener('click', showGallery);
  document.getElementById('galleryClose').addEventListener('click', hideGallery);

  // Color picker
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      strokeColor = btn.dataset.color;
    });
  });

  // Size picker
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      strokeSize = parseInt(btn.dataset.size);
    });
  });

  // Model picker
  document.querySelectorAll('.model-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.model-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      applyModel(swatch.dataset.model);
    });
  });
}

// ─── Model switching ───

function applyModel(name) {
  const m = models[name];
  if (!m) return;

  const body = document.getElementById('etchBody');
  const title = document.getElementById('etchTitle');

  // Body color
  body.style.background = m.body;
  body.style.borderColor = m.border;

  // Themed class (switches button/label colors)
  if (m.themed) {
    body.classList.add('themed');
  } else {
    body.classList.remove('themed');
  }

  // Knob style
  document.querySelectorAll('.knob').forEach(k => {
    k.className = 'knob ' + m.knob;
  });

  // Title color
  if (m.title === 'white') {
    title.style.background = 'none';
    title.style.webkitBackgroundClip = 'unset';
    title.style.webkitTextFillColor = 'rgba(255,255,255,0.9)';
    title.style.backgroundClip = 'unset';
  } else {
    title.style.background = 'linear-gradient(160deg, #bf953f 0%, #fcf6ba 25%, #b38728 50%, #fbf5b7 75%, #aa771c 100%)';
    title.style.webkitBackgroundClip = 'text';
    title.style.webkitTextFillColor = 'transparent';
    title.style.backgroundClip = 'text';
  }
}

// ─── Gallery / Display ───

function showGallery() {
  const overlay = document.getElementById('galleryOverlay');
  const img = document.getElementById('galleryImg');
  const captionEl = document.getElementById('galleryCaptionText');

  // Capture current drawing as image
  const dataURL = drawingLayer.elt.toDataURL('image/png');
  img.src = dataURL;

  // Random caption
  const caption = captions[Math.floor(Math.random() * captions.length)];
  captionEl.innerHTML = caption.replace(/\n/g, '<br>');

  overlay.classList.add('visible');
}

function hideGallery() {
  document.getElementById('galleryOverlay').classList.remove('visible');
}

// ─── Drawing ───

function draw() {
  smoothX = lerp(smoothX, potX, 0.15);
  smoothY = lerp(smoothY, potY, 0.15);

  let drawX = map(smoothX, 0, 1023, 0, width);
  let drawY = map(smoothY, 0, 1023, 0, height);

  if (isConnected && !isClearing) {
    drawingLayer.stroke(strokeColor);
    drawingLayer.strokeWeight(strokeSize);
    drawingLayer.line(prevDrawX, prevDrawY, drawX, drawY);
  }

  prevDrawX = drawX;
  prevDrawY = drawY;

  // Clear animation
  if (isClearing) {
    clearProgress += 0.03;
    let alpha = map(clearProgress, 0, 1, 0, 40);
    drawingLayer.noStroke();
    drawingLayer.fill(240, 240, 238, alpha);
    drawingLayer.rect(0, 0, width, height);
    if (clearProgress >= 1) {
      drawingLayer.background(240, 240, 238);
      isClearing = false;
      clearProgress = 0;
    }
  }

  image(drawingLayer, 0, 0);

  // Crosshair
  stroke(0, 0, 0, 80);
  strokeWeight(1);
  line(drawX - 10, drawY, drawX - 4, drawY);
  line(drawX + 4, drawY, drawX + 10, drawY);
  line(drawX, drawY - 10, drawX, drawY - 4);
  line(drawX, drawY + 4, drawX, drawY + 10);

  noStroke();
  fill(strokeColor);
  circle(drawX, drawY, strokeSize + 2);

  rotateKnob('knobL', smoothX);
  rotateKnob('knobR', smoothY);
}

function rotateKnob(id, value) {
  const el = document.getElementById(id);
  if (el) {
    let angle = map(value, 0, 1023, -150, 150);
    el.style.transform = `rotate(${angle}deg)`;
  }
}

function clearScreen() {
  isClearing = true;
  clearProgress = 0;
}

// ─── Serial ───

async function connectSerial() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    isConnected = true;
    document.getElementById('connectBtn').disabled = true;
    document.getElementById('disconnectBtn').disabled = false;

    setTimeout(() => {
      prevDrawX = map(smoothX, 0, 1023, 0, width);
      prevDrawY = map(smoothY, 0, 1023, 0, height);
    }, 200);

    readSerial();
  } catch (err) {
    console.error('Connection error:', err);
  }
}

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
            let parts = line.split(',');
            let x = parseInt(parts[0]);
            let y = parseInt(parts[1]);
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
    document.getElementById('connectBtn').disabled = false;
    document.getElementById('disconnectBtn').disabled = true;
  } catch (err) {
    console.error('Disconnect error:', err);
  }
}

window.addEventListener('beforeunload', () => {
  if (isConnected) disconnectSerial();
});
