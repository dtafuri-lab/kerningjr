/*
  Potentiometer Serial Reader
  Reads analog value from potentiometer and sends it via Serial
  With noise filtering for stable readings
  
  Wiring for TRIMPOT (3 pins - 2 on one side, 1 on other):
  - Two pins side: one to 5V, one to GND
  - Single pin (alone): to A0
*/

const int POT_PIN = A0;  // Analog pin connected to potentiometer
const int NUM_SAMPLES = 10;  // Number of samples to average

int samples[NUM_SAMPLES];
int sampleIndex = 0;
int lastSentValue = -1;

void setup() {
  Serial.begin(9600);    // Start serial communication at 9600 baud
  
  // Initialize samples array
  for (int i = 0; i < NUM_SAMPLES; i++) {
    samples[i] = analogRead(POT_PIN);
  }
}

void loop() {
  // Read new sample
  samples[sampleIndex] = analogRead(POT_PIN);
  sampleIndex = (sampleIndex + 1) % NUM_SAMPLES;
  
  // Calculate average of all samples
  long sum = 0;
  for (int i = 0; i < NUM_SAMPLES; i++) {
    sum += samples[i];
  }
  int avgValue = sum / NUM_SAMPLES;
  
  // Only send if value changed by more than 2 (reduces noise)
  if (abs(avgValue - lastSentValue) > 2) {
    Serial.println(avgValue);
    lastSentValue = avgValue;
  }
  
  // Small delay for stability
  delay(20);
}
