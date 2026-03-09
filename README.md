# Potentiometer → Text (Web Serial demo)

This project is a small web demo that reads a potentiometer value from an Arduino over the Web Serial API and maps it to the size of text displayed with p5.js.

What's in this repo
- `index.html` — UI and controls
- `sketch.js` — p5.js sketch that handles serial connection, parsing, and rendering
- `arduino/potentiometer_serial/potentiometer_serial.ino` — example Arduino sketch (reads analog value and prints it over serial)
- `font-morph.*` — experiments

Quick local steps
1. Serve the folder with a local HTTP server (required for Web Serial), e.g. `npx http-server` or `python3 -m http.server` in the project root.
2. Open `http://localhost:8080` (or the port your server uses) in a Chromium-based browser that supports the Web Serial API (Chrome, Edge).
3. Click "Connect" and select your Arduino serial port (Arduino should be running the example sketch at 9600 baud).

How to push to GitHub
1. Create a GitHub repo (or copy its URL if you already have one).
2. On your machine run:

```bash
cd "$(pwd)" # ensure you're in the project folder
git remote add origin <REPO_URL>
git push -u origin main
```

If you'd like, I can add the remote and push for you — tell me the repo URL and whether you prefer HTTPS or SSH.

License: Unlicensed / your choice
