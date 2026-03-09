// Kerning Jr. - The Font Wash

let port;
let reader;
let inputBuffer = '';
let potValue = 0;
let smoothedValue = 0;
let isConnected = false;

// Game state
let cleaningProgress = 0;
let isComplete = false;
let waterRunning = false;
let lastWaterTime = 0;
const CLEANING_DURATION = 10000; // 10 seconds to fully clean

// Target tracking mini-game
let targetPosition = 50; // Where the target square is (0-100)
let targetDirection = 1;
let targetSpeed = 0.3; // How fast target moves
let inTargetZone = false;

// Water lines
let waterLines = [];
const maxLines = 50;

// Dirt particles
let dirtParticles = [];

function setup() {
  let canvas = createCanvas(windowWidth, 420);
  canvas.parent('canvas-container');
  
  // Initialize water lines
  for (let i = 0; i < maxLines; i++) {
    waterLines.push({
      x: random(width),
      y: random(-height, 0),
      speed: random(12, 22),
      length: random(40, 100),
      weight: random(1.5, 3)
    });
  }
  
  // Initialize dirt particles around where Kerning Jr will be
  for (let i = 0; i < 25; i++) {
    dirtParticles.push({
      x: width/2 + random(-150, 150),
      y: height/2 + random(-120, 120),
      size: random(8, 25),
      rotation: random(TWO_PI),
      opacity: random(150, 255)
    });
  }
  
  // Setup click handlers
  document.getElementById('actionBox').addEventListener('click', handleActionClick);
  document.getElementById('storyClose').addEventListener('click', closeStory);
  document.getElementById('storyStart').addEventListener('click', closeStory);
  document.getElementById('victoryClose').addEventListener('click', closeVictory);
  document.getElementById('victoryRestart').addEventListener('click', restartGame);
}

function closeStory() {
  document.getElementById('storyOverlay').classList.add('hidden');
}

function closeVictory() {
  document.getElementById('victoryOverlay').classList.add('hidden');
}

function restartGame() {
  // Reset game state
  cleaningProgress = 0;
  isComplete = false;
  waterRunning = false;
  lastWaterTime = 0;
  
  // Reset target tracking
  targetPosition = 50;
  targetDirection = 1;
  targetSpeed = 0.3;
  inTargetZone = false;
  
  // Reinitialize dirt particles
  dirtParticles = [];
  for (let i = 0; i < 25; i++) {
    dirtParticles.push({
      x: width/2 + random(-150, 150),
      y: height/2 + random(-120, 120),
      size: random(8, 25),
      rotation: random(TWO_PI),
      opacity: random(150, 255)
    });
  }
  
  // Reset UI
  document.getElementById('mainContainer').className = 'container';
  document.getElementById('pageTitle').textContent = 'Kerning Jr.';
  
  // Close victory popup
  document.getElementById('victoryOverlay').classList.add('hidden');
}

function windowResized() {
  resizeCanvas(windowWidth, 420);
  
  // Reinitialize dirt particles for new width
  dirtParticles = [];
  for (let i = 0; i < 25; i++) {
    dirtParticles.push({
      x: width/2 + random(-150, 150),
      y: height/2 + random(-120, 120),
      size: random(8, 25),
      rotation: random(TWO_PI),
      opacity: random(150, 255)
    });
  }
}

function draw() {
  // Background - same blue-gray as the page
  background(184, 197, 206);
  
  // Smooth the potentiometer value
  smoothedValue = lerp(smoothedValue, potValue, 0.1);
  
  // Map potentiometer to arrow position (0-100)
  let arrowPosition = map(smoothedValue, 0, 1020, 100, 0);
  arrowPosition = constrain(arrowPosition, 0, 100);
  
  // Move the target square back and forth
  if (isConnected && !isComplete) {
    targetPosition += targetDirection * targetSpeed;
    
    // Bounce off edges with some randomness
    if (targetPosition >= 85) {
      targetDirection = -1;
      targetSpeed = random(0.2, 0.5); // Vary speed for difficulty
    } else if (targetPosition <= 15) {
      targetDirection = 1;
      targetSpeed = random(0.2, 0.5);
    }
    
    // Occasionally change direction randomly
    if (random() < 0.002) {
      targetDirection *= -1;
    }
  }
  
  // Check if arrow is inside the target zone (smaller zone = harder)
  let targetZoneSize = 8;
  inTargetZone = abs(arrowPosition - targetPosition) < targetZoneSize;
  
  // Water runs when arrow is in target zone
  waterRunning = inTargetZone;
  
  // Cleaning progress increases over time while arrow is in target zone
  // Lose progress when outside the zone!
  if (inTargetZone && !isComplete && isConnected) {
    // Increment progress based on time elapsed
    let now = millis();
    if (lastWaterTime > 0) {
      let deltaTime = now - lastWaterTime;
      cleaningProgress += (deltaTime / CLEANING_DURATION) * 100;
      cleaningProgress = constrain(cleaningProgress, 0, 100);
    }
    lastWaterTime = now;
  } else if (!inTargetZone && !isComplete && isConnected) {
    // Lose progress when outside the zone
    cleaningProgress -= 0.3;
    cleaningProgress = constrain(cleaningProgress, 0, 100);
    lastWaterTime = 0;
  } else {
    lastWaterTime = 0;
  }
  
  // Check for completion
  if (cleaningProgress >= 100 && !isComplete) {
    isComplete = true;
    celebrate();
  }
  
  // Draw dirt (fades based on cleaning progress)
  let dirtOpacity = isComplete ? 0 : map(cleaningProgress, 0, 100, 255, 0);
  drawDirt(dirtOpacity);
  
  // Draw water if in target zone
  if (inTargetZone && !isComplete && isConnected) {
    let waterIntensity = 60; // Consistent water when in zone
    drawWater(waterIntensity);
  }
  
  // Draw Kerning Jr.
  drawKerningJr(isComplete, cleaningProgress);
  
  // Update the target bar (in the HTML element)
  if (isConnected && !isComplete) {
    updateTargetBar(arrowPosition, targetPosition, targetZoneSize);
  }
  
  // Update UI
  updateUI(arrowPosition, cleaningProgress, inTargetZone);
}

function updateTargetBar(arrowPos, targetPos, zoneSize) {
  const targetBar = document.getElementById('targetBar');
  const targetZone = document.getElementById('targetZone');
  const arrowPointer = document.getElementById('arrowPointer');
  
  if (!targetBar) return;
  
  targetBar.style.display = 'block';
  
  // Position the target zone
  let zoneLeft = targetPos - zoneSize;
  let zoneWidth = zoneSize * 2;
  targetZone.style.left = zoneLeft + '%';
  targetZone.style.width = zoneWidth + '%';
  
  // Add/remove active class based on whether in zone
  if (inTargetZone) {
    targetZone.classList.add('active');
  } else {
    targetZone.classList.remove('active');
  }
  
  // Position the arrow pointer
  arrowPointer.style.left = arrowPos + '%';
}

function hideTargetBar() {
  const targetBar = document.getElementById('targetBar');
  if (targetBar) {
    targetBar.style.display = 'none';
  }
}

function drawDirt(opacity) {
  noStroke();
  
  for (let particle of dirtParticles) {
    fill(80, 60, 40, opacity * (particle.opacity / 255));
    
    push();
    translate(particle.x, particle.y);
    rotate(particle.rotation);
    
    // Blob shape
    beginShape();
    for (let a = 0; a < TWO_PI; a += 0.4) {
      let r = particle.size + noise(particle.x * 0.01, particle.y * 0.01, a) * 10;
      vertex(cos(a) * r, sin(a) * r);
    }
    endShape(CLOSE);
    pop();
  }
}

function drawWater(intensity) {
  let activeLines = map(intensity, 15, 100, 8, maxLines);
  let speedMult = map(intensity, 15, 100, 0.4, 1.3);
  
  for (let i = 0; i < activeLines; i++) {
    let line = waterLines[i];
    
    let alpha = 100;
    if (line.y < 30) alpha = map(line.y, -30, 30, 0, 100);
    if (line.y + line.length > height - 30) {
      alpha = map(line.y + line.length, height - 30, height + 30, 100, 0);
    }
    
    stroke(120, 160, 200, alpha);
    strokeWeight(line.weight);
    strokeCap(ROUND);
    
    beginShape(LINES);
    vertex(line.x, line.y);
    vertex(line.x, line.y + line.length);
    endShape();
    
    line.y += line.speed * speedMult;
    
    if (line.y > height + 50) {
      line.y = random(-80, -20);
      line.x = random(width);
    }
  }
}

function drawKerningJr(clean, progress) {
  let centerX = width / 2;
  let centerY = height / 2;
  
  push();
  translate(centerX, centerY);
  
  stroke(0);
  strokeWeight(3);
  noFill();
  
  // Head
  ellipse(0, -40, 130, 130);
  
  if (clean) {
    // Happy face when clean!
    // Happy eyes (simple arcs)
    noFill();
    arc(-25, -55, 30, 20, PI, TWO_PI);
    arc(25, -55, 30, 20, PI, TWO_PI);
    
    // Big smile
    noFill();
    arc(0, -25, 60, 50, 0, PI);
  } else {
    // Spiral eyes when dirty
    drawSpiral(-25, -50, 22, 2.5);
    drawSpiral(25, -50, 22, 2.5);
    
    // Mouth (small oval)
    fill(0);
    ellipse(0, -10, 15, 20);
    noFill();
  }
  
  // Body - accordion/zigzag shape
  beginShape();
  vertex(-80, 20);
  vertex(-50, 50);
  vertex(-80, 80);
  vertex(-50, 110);
  vertex(-30, 90);
  endShape();
  
  beginShape();
  vertex(80, 20);
  vertex(50, 50);
  vertex(80, 80);
  vertex(50, 110);
  vertex(30, 90);
  endShape();
  
  // Connect body
  line(-30, 90, 30, 90);
  line(-50, 20, 50, 20);
  
  // Draw "WOW!" on the body/shirt area
  // Kerning gets better as progress increases
  drawWowText(progress, clean);
  
  // Arms
  // Left arm
  line(-80, 20, -100, 10);
  ellipse(-115, 5, 35, 30);
  
  // Right arm  
  line(80, 20, 100, 40);
  line(100, 40, 95, 70);
  ellipse(95, 85, 30, 35);
  
  // Legs
  line(-10, 110, -15, 150);
  line(-15, 150, -30, 155);
  line(-30, 155, -35, 165);
  
  line(10, 110, 20, 150);
  line(20, 150, 15, 170);
  line(15, 170, 35, 175);
  
  // Sparkles if clean
  if (clean) {
    drawCleanSparkles();
  }
  
  pop();
}

function drawWowText(progress, clean) {
  // WOW! text on the shirt
  // Bad kerning when dirty (too spaced out), standard kerning when clean
  
  push();
  
  // Position on the body
  let textY = 60;
  
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(18);
  textFont('Arial Black, sans-serif');
  
  if (progress >= 100) {
    // When fully clean, just draw "WOW!" as normal text - browser handles kerning
    text("WOW!", 0, textY);
  } else {
    // Draw individual letters with bad spacing that improves
    textAlign(LEFT, CENTER);
    
    let letters = ['W', 'O', 'W', '!'];
    
    // Bad kerning: too much space between letters
    let badSpacing = [0, 26, 52, 76]; // Spread out when dirty
    // Good spacing: normal text (measure actual widths)
    let goodSpacing = [0, 16, 32, 46]; // Approximate normal spacing
    
    let startXBad = -42;
    let startXGood = -32;
    let startX = lerp(startXBad, startXGood, progress / 100);
    
    for (let i = 0; i < letters.length; i++) {
      let badPos = badSpacing[i];
      let goodPos = goodSpacing[i];
      let currentPos = lerp(badPos, goodPos, progress / 100);
      
      text(letters[i], startX + currentPos, textY);
    }
  }
  
  pop();
}

function drawSpiral(x, y, size, turns) {
  noFill();
  beginShape();
  for (let a = 0; a < TWO_PI * turns; a += 0.2) {
    let r = map(a, 0, TWO_PI * turns, 2, size);
    let px = x + cos(a) * r;
    let py = y + sin(a) * r;
    vertex(px, py);
  }
  endShape();
}

function drawCleanSparkles() {
  let numSparkles = 6;
  
  for (let i = 0; i < numSparkles; i++) {
    let angle = (frameCount * 0.015 + i * (TWO_PI / numSparkles)) % TWO_PI;
    let distance = 160 + sin(frameCount * 0.03 + i) * 15;
    let x = cos(angle) * distance;
    let y = sin(angle) * distance * 0.6 - 20;
    
    stroke(0);
    strokeWeight(2);
    
    push();
    translate(x, y);
    rotate(frameCount * 0.02);
    
    // 4-point star
    let size = 8 + sin(frameCount * 0.08 + i) * 3;
    line(-size, 0, size, 0);
    line(0, -size, 0, size);
    line(-size*0.5, -size*0.5, size*0.5, size*0.5);
    line(-size*0.5, size*0.5, size*0.5, -size*0.5);
    pop();
  }
}

function updateUI(arrowPos, progress, isInZone) {
  const messageBox = document.getElementById('messageBox');
  const actionBox = document.getElementById('actionBox');
  const pageTitle = document.getElementById('pageTitle');
  const container = document.getElementById('mainContainer');
  
  if (!isConnected) {
    messageBox.textContent = "Kerning Jr. is looking dusty. Ready for a wash?";
    actionBox.textContent = "Connect";
    actionBox.className = "action-box";
    return;
  }
  
  if (isComplete) {
    container.className = "container celebration";
    pageTitle.textContent = "✨ Kerning Jr. ✨";
    messageBox.textContent = "Congratulations! Kerning Jr. is sparkling clean.";
    actionBox.textContent = "Complete!";
    actionBox.className = "action-box disabled";
  } else if (isInZone) {
    // Arrow is in the target zone - water running!
    if (progress < 30) {
      messageBox.textContent = "Perfect! Keep following the target...";
    } else if (progress < 70) {
      messageBox.textContent = "You're doing great! Stay in the zone...";
    } else if (progress < 95) {
      messageBox.textContent = "Almost there! Don't lose it now...";
    } else {
      messageBox.textContent = "So close! Hold it steady...";
    }
    actionBox.textContent = "🚿 Washing...";
    actionBox.className = "action-box washing";
  } else {
    // Arrow is outside the target zone
    messageBox.textContent = "Match the arrow to the moving target!";
    actionBox.textContent = "Follow the target ➤";
    actionBox.className = "action-box warning";
  }
}

function celebrate() {
  console.log("🎉 Kerning Jr. is clean!");
  
  // Hide the target bar
  hideTargetBar();
  
  // Show victory popup after a short delay
  setTimeout(() => {
    document.getElementById('victoryOverlay').classList.remove('hidden');
  }, 1000);
}

function handleActionClick() {
  if (!isConnected) {
    connectSerial();
  }
}

async function connectSerial() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    
    isConnected = true;
    console.log("Connected to Arduino!");
    
    readSerial();
    
  } catch (error) {
    console.error('Connection error:', error);
    alert('Could not connect. Make sure your Arduino is plugged in and try again.');
  }
}

async function readSerial() {
  const decoder = new TextDecoderStream();
  const inputDone = port.readable.pipeTo(decoder.writable);
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
  }
}

window.addEventListener('beforeunload', async () => {
  if (reader) {
    await reader.cancel();
  }
  if (port) {
    await port.close();
  }
});
