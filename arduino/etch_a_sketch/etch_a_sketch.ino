/*
  Etch A Sketch — Two Potentiometer Serial
  Sends "x,y\n" at 9600 baud with noise filtering.
  Pot 1 (X) on A0, Pot 2 (Y) on A5.
*/

const int POT_X = A0;
const int POT_Y = A5;
const int NUM_SAMPLES = 8;

int samplesX[NUM_SAMPLES];
int samplesY[NUM_SAMPLES];
int idx = 0;
int lastX = -1, lastY = -1;

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < NUM_SAMPLES; i++) {
    samplesX[i] = analogRead(POT_X);
    samplesY[i] = analogRead(POT_Y);
  }
}

void loop() {
  samplesX[idx] = analogRead(POT_X);
  samplesY[idx] = analogRead(POT_Y);
  idx = (idx + 1) % NUM_SAMPLES;

  long sumX = 0, sumY = 0;
  for (int i = 0; i < NUM_SAMPLES; i++) {
    sumX += samplesX[i];
    sumY += samplesY[i];
  }
  int avgX = sumX / NUM_SAMPLES;
  int avgY = sumY / NUM_SAMPLES;

  if (abs(avgX - lastX) > 1 || abs(avgY - lastY) > 1) {
    Serial.print(avgX);
    Serial.print(",");
    Serial.println(avgY);
    lastX = avgX;
    lastY = avgY;
  }
  delay(16);
}
