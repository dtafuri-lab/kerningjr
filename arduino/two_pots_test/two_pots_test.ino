/*
  Two Potentiometer Test
  Reads A0 and A5 and prints both values so you can verify wiring.
  Open the Serial Monitor at 9600 baud to see output.
*/

const int POT_X = A0;
const int POT_Y = A5;

void setup() {
  Serial.begin(9600);
}

void loop() {
  int x = analogRead(POT_X);
  int y = analogRead(POT_Y);

  Serial.print(x);
  Serial.print(",");
  Serial.println(y);

  delay(50);
}
