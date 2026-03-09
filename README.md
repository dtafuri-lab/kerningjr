# Kerning Jr.

**Kerning Jr.** is a collection of playful, physical-computing web toys that connect Arduino potentiometers to the browser using the **Web Serial API**. Turn real knobs to interact with on-screen visuals in real time.

## ⭐ Main Project — 3D Etch A Sketch

A photorealistic 3D Etch A Sketch built with **Three.js**. Two potentiometers control X/Y drawing. The device shows its back panel (with embossed plastic toy text) by default and flips around to reveal the drawing screen when the Arduino is connected.

**→ Open `index.html`** (or visit the [live site](https://dtafuri-lab.github.io/kerningjr/))

## Project Structure

```
├── index.html                        # 3D Etch A Sketch (main project)
├── app.js                            # Three.js scene, drawing, serial
├── demos/
│   ├── potentiometer/                # Simple pot → text-size demo
│   │   ├── index.html
│   │   └── sketch.js
│   ├── kerning-jr/                   # "The Font Wash" mini-game
│   │   ├── index.html
│   │   └── game.js
│   └── etch-a-sketch-2d/            # 2D p5.js Etch A Sketch
│       ├── index.html
│       └── sketch.js
├── arduino/
│   ├── potentiometer_serial/         # Single-pot Arduino sketch
│   ├── two_pots_test/                # Two-pot test sketch
│   └── etch_a_sketch/                # Two-pot averaged sketch (main)
└── README.md
```

## Hardware

- Arduino (Uno, Nano, etc.)
- Two potentiometers / trimpots (A0 for X, A5 for Y)
- USB cable

## Quick Start

1. **Flash the Arduino** — open `arduino/etch_a_sketch/etch_a_sketch.ino` and upload.
2. **Serve the project** — Web Serial requires localhost or HTTPS:
   ```bash
   npx http-server . -p 8080 -c-1
   ```
3. **Open in Chrome / Edge** — navigate to `http://localhost:8080`.
4. Click **Connect** and choose the Arduino's serial port.
5. Turn the knobs and draw!

## License

This project is currently unlicensed — feel free to add a license of your choice.
