#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "DHT.h"

// ====== CAU HINH ======
#define DHTPIN 2
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x3F, 20, 4);

// CHAN DIEU KHIEN
#define LED_PIN 13
#define FAN_PIN 12
#define MOTOR_LED 7
#define LDR_PIN A0
#define SOIL_PIN A2
#define MIST_PIN 11

// NGUONG KIEM SOAT
int lightThreshold = 400;
int tempThreshold = 30;
int soilThreshold = 70;

// ======== CHE DO GIA LAP ========
#define SIMULATION true
unsigned long lastUpdate = 0;
unsigned long lastSerialTime = 0;
const unsigned long serialInterval = 3000; 
int simHour = 0;

// GIA TRI BAN DAU
float t = 0;
float h = 0;
int lightValue = 0;
int soilValue = 0;

// BIEN TRANG THAI (De gui len Web)
int fanStatus = 0;
int mistStatus = 0;
int lampStatus = 0;
int pumpStatus = 0;

// ------------------
// DRIFT (Giu nguyen logic cua ban)
// ------------------
float drift(float base, float minV, float maxV, float rate = 0.05) {
  float delta = base * rate;
  float newv = base + random(-delta, delta);
  if (newv < minV) newv = minV;
  if (newv > maxV) newv = maxV;
  return newv;
}

// ------------------------------
// LIGHT CURVE
// ------------------------------
int generateLightByHour(int hour) {
  if (hour < 6 || hour >= 19) return 100; // Toi
  float peak = 1023.0;
  float x = hour - 12;
  float max_x = 6;
  float value = peak * (1.0 - (x * x) / (max_x * max_x));
  return (int) drift(value, 100, 1023);
}

// ------------------------------
// SINH DU LIEU THEO GIO
// ------------------------------
void generateByHour(int hNow) {
  lightValue = generateLightByHour(hNow);

  if (hNow >= 0 && hNow < 6) {
    t = drift(t, 18, 26); h = drift(h, 75, 95); soilValue = drift(soilValue, 60, 90);
  } else if (hNow >= 6 && hNow < 11) {
    t = drift(t, 22, 32); h = drift(h, 55, 80); soilValue = drift(soilValue, 55, 85);
  } else if (hNow >= 11 && hNow < 16) {
    t = drift(t, 28, 40); h = drift(h, 40, 65); soilValue = drift(soilValue, 40, 70);
  } else if (hNow >= 16 && hNow < 19) {
    t = drift(t, 24, 33); h = drift(h, 50, 75); soilValue = drift(soilValue, 50, 80);
  } else {
    t = drift(t, 22, 28); h = drift(h, 65, 90); soilValue = drift(soilValue, 55, 90);
  }
}

// ===============================
//             SETUP
// ===============================
void setup() {
  Serial.begin(9600);
  // KHONG in bat ky text nao o day (vi du: Connected) de tranh loi JSON
  
  dht.begin();

  pinMode(LED_PIN, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);
  pinMode(MOTOR_LED, OUTPUT);
  pinMode(MIST_PIN, OUTPUT);

  lcd.init();
  lcd.backlight();

  lcd.setCursor(0,0);
  lcd.print("Vuon thong minh - Fck you");
  delay(1000);
  lcd.clear();

  // Init gia tri
  t = 25; h = 70; soilValue = 60; lightValue = 500;
}

// ===============================
//             LOOP
// ===============================
void loop() {

  // 1. MO PHONG THOI GIAN (Moi 5s thuc = 1 gio ao)
  if (SIMULATION) {
    if (millis() - lastUpdate > 5000) { 
      simHour++;
      if (simHour > 23) simHour = 0;
      generateByHour(simHour);
      lastUpdate = millis();
    }
  } else {
    h = dht.readHumidity();
    t = dht.readTemperature();
    lightValue = analogRead(LDR_PIN);
    soilValue = map(analogRead(SOIL_PIN), 0, 1023, 0, 100);
  }

  // 2. CAP NHAT TRANG THAI THIET BI (Luu vao bien de gui di)
  fanStatus = (t > tempThreshold) ? 1 : 0;
  mistStatus = (h < 60) ? 1 : 0;
  lampStatus = (lightValue < lightThreshold) ? 1 : 0;
  pumpStatus = (soilValue < soilThreshold) ? 1 : 0;

  // 3. DIEU KHIEN PHAN CUNG
  digitalWrite(FAN_PIN, fanStatus);
  digitalWrite(MIST_PIN, mistStatus);
  digitalWrite(LED_PIN, lampStatus);
  digitalWrite(MOTOR_LED, pumpStatus);

  // 4. GUI JSON QUA SERIAL (Quan trong nhat)
  if (millis() - lastSerialTime >= serialInterval) {
    lastSerialTime = millis();
    
    // Format: {"hour":12,"temp":30.5,"hum":80,"soil":60,"light":500,"fan":1,"mist":0,"pump":0,"lamp":1}
    Serial.print("{");
    Serial.print("\"hour\":"); Serial.print(simHour); Serial.print(",");
    Serial.print("\"temp\":"); Serial.print(t); Serial.print(",");
    Serial.print("\"hum\":"); Serial.print(h); Serial.print(",");
    Serial.print("\"soil\":"); Serial.print(soilValue); Serial.print(",");
    Serial.print("\"light\":"); Serial.print(lightValue); Serial.print(",");
    
    // Trang thai thiet bi (0 hoac 1)
    Serial.print("\"fan\":"); Serial.print(fanStatus); Serial.print(",");
    Serial.print("\"mist\":"); Serial.print(mistStatus); Serial.print(",");
    Serial.print("\"pump\":"); Serial.print(pumpStatus); Serial.print(",");
    Serial.print("\"lamp\":"); Serial.print(lampStatus);
    
    Serial.println("}"); // Ket thuc goi tin
  }

  // 5. HIEN THI LCD (Cho nguoi xem Proteus)
  lcd.setCursor(0,0);
  lcd.print("T:"); lcd.print((int)t); lcd.print(" H:"); lcd.print((int)h); lcd.print("% ");
  lcd.print(simHour); lcd.print("h ");

  lcd.setCursor(0,1);
  lcd.print("S:"); lcd.print(soilValue); lcd.print("% ");
  lcd.print("L:"); lcd.print(lightValue < lightThreshold ? "Lo" : "Hi");
  
  lcd.setCursor(0,2); // Hien thi trang thai duoi dang so 0/1
  lcd.print("Fan:"); lcd.print(fanStatus);
  lcd.print(" Pmp:"); lcd.print(pumpStatus);
  lcd.print(" Lit:"); lcd.print(lampStatus);

  // Dong 4 bo trong hoac them thong tin khac
  lcd.setCursor(0,3);
  lcd.print("Mist:"); lcd.print(mistStatus);
  
  delay(200);
}