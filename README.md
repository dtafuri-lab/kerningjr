# Kerning Jr.

**Kerning Jr.** is a playful, physical-computing web toy that connects a potentiometer (via Arduino) to a browser using the **Web Serial API** and **p5.js**. Turn the knob to interact with typography in real time — resize text, wash fonts, and play a mini-game called *The Font Wash*.

## What it does

1. An Arduino reads a potentiometer's analog value (0–1023) and streams it over serial at 9600 baud.
2. A web page picks up those values through the Web Serial API (Chromium browsers only).
3. p5.js maps the knob position to on-screen visuals — text size, water effects, cleaning progress, and more.

## What's in this repo

| File | Description |
|------|-------------|
| `font-morph.html` | **Kerning Jr. — The Font Wash** main page (the mini-game) |
| `font-morph.js` | Game logic: target tracking, water animation, dirt particles, victory state |
| `index.html` | Simpler demo — maps potentiometer value directly to text size |
| `sketch.js` | p5.js sketch for the simple demo (serial connection, parsing, rendering) |
| `arduino/potentiometer_serial/potentiometer_serial.ino` | Arduino sketch — reads the pot with noise filtering and prints averaged values over serial |

## Hardware you need

- An Arduino (Uno, Nano, etc.)
- A potentiometer or trimpot
- USB cable to connect the Arduino to your computer

### Wiring (trimpot)

| Trimpot pin | Connect to |
|-------------|-----------|
| Pin 1 (side with two pins) | **5 V** |
| Pin 2 (side with two pins) | **GND** |
| Pin 3 (alone on the other side) | **A0** |

## Quick start

1. **Flash the Arduino** — open `arduino/potentiometer_serial/potentiometer_serial.ino` in the Arduino IDE and upload it.
2. **Serve the project folder** — Web Serial requires HTTPS or localhost, so use any local server:
   ```bash
   # pick one
   npx http-server .
   python3 -m http.server
   ```
3. **Open in Chrome / Edge** — navigate to `http://localhost:8080` (or whatever port your server prints).
4. **Click "Connect"** and choose the Arduino's serial port.
5. Turn the knob and watch the magic happen!

> **Tip:** Open `font-morph.html` instead of `index.html` for the full Kerning Jr. experience.

## License

This project is currently unlicensed — feel free to add a license of your choice.
