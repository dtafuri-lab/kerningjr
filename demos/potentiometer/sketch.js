// Potentiometer Demo

let port;
let reader;
let inputBuffer = '';
let potValue = 512; // Default middle value (0-1023)
let smoothedValue = 512;
let isConnected = false;

// Text settings - Are.na style
const displayText = "Hello";
const minTextSize = 16;
const maxTextSize = 300;

function setup() {
  let canvas = createCanvas(1000, 600);
  canvas.parent('canvas-container');
  textAlign(CENTER, CENTER);
  
  // Setup button handlers
  document.getElementById('connectBtn').addEventListener('click', connectSerial);
  document.getElementById('disconnectBtn').addEventListener('click', disconnectSerial);
}

function draw() {
  // Clean white background - Are.na style
  background(255);
  
  // Smooth the potentiometer value for fluid animation
  smoothedValue = lerp(smoothedValue, potValue, 0.12);
  
  // Map potentiometer value (0-1020) to text size
  let textSizeValue = map(smoothedValue, 0, 1020, minTextSize, maxTextSize);
  
  // Draw the main text - minimal black on white
  fill(51); // #333
  noStroke();
  textFont('IBM Plex Sans');
  textStyle(NORMAL);
  textSize(textSizeValue);
  text(displayText, width / 2, height / 2);
  
  // Draw subtle progress line at bottom
  drawProgressLine();
  
  // Update info panel values
  updateInfoPanel(textSizeValue);
}

function drawProgressLine() {
  // Minimal progress indicator at bottom
  let progress = map(smoothedValue, 0, 1020, 0, width);
  
  // Background line
  stroke(240);
  strokeWeight(1);
  line(0, height - 1, width, height - 1);
  
  // Progress line
  stroke(51);
  line(0, height - 1, progress, height - 1);
}

function updateInfoPanel(currentSize) {
  // Update the HTML info blocks
  const rawValueEl = document.getElementById('rawValue');
  const textSizeEl = document.getElementById('textSize');
  const statusEl = document.getElementById('connectionStatus');
  
  if (rawValueEl) {
    rawValueEl.textContent = Math.round(smoothedValue);
  }
  if (textSizeEl) {
    textSizeEl.textContent = Math.round(currentSize) + 'px';
  }
  if (statusEl) {
    statusEl.textContent = isConnected ? '● Connected' : '○ Idle';
    statusEl.style.color = isConnected ? '#17ac10' : '#999';
  }
}

async function connectSerial() {
  try {
    // Request a serial port
    port = await navigator.serial.requestPort();
    
    // Open the port at 9600 baud (must match Arduino)
    await port.open({ baudRate: 9600 });
    
    isConnected = true;
    updateStatus('Connected', true);
    document.getElementById('connectBtn').disabled = true;
    document.getElementById('disconnectBtn').disabled = false;
    
    // Start reading
    readSerial();
    
  } catch (error) {
    console.error('Connection error:', error);
    updateStatus('Connection failed: ' + error.message, false);
  }
}

async function readSerial() {
  const decoder = new TextDecoderStream();
  const inputDone = port.readable.pipeTo(decoder.writable);
  reader = decoder.readable.getReader();
  
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        inputBuffer += value;
        
        // Process complete lines (Arduino sends data with newline)
        let lines = inputBuffer.split('\n');
        inputBuffer = lines.pop(); // Keep incomplete line in buffer
        
        for (let line of lines) {
          line = line.trim();
          if (line.length > 0) {
            let parsed = parseInt(line);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 1023) {
              potValue = parsed;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Read error:', error);
    if (isConnected) {
      updateStatus('Read error: ' + error.message, false);
    }
  }
}

async function disconnectSerial() {
  try {
    isConnected = false;
    
    if (reader) {
      await reader.cancel();
      reader = null;
    }
    
    if (port) {
      await port.close();
      port = null;
    }
    
    updateStatus('Disconnected', false);
    document.getElementById('connectBtn').disabled = false;
    document.getElementById('disconnectBtn').disabled = true;
    
  } catch (error) {
    console.error('Disconnect error:', error);
  }
}

function updateStatus(message, connected) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = connected ? 'connected' : 'disconnected';
}

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (isConnected) {
    disconnectSerial();
  }
});
