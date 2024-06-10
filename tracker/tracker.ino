#include "_config.h"
#include "ota_update.h"
#define RX A3  // GPS Pins
#define TX A2  // GPS Pins
#include "SOAR_Lora.h"
#include <Adafruit_GPS.h>
#include <HardwareSerial.h>
#include "utils.h"
#include "SOAR_gps.h"

uint32_t GPS_FOCUS_MAX = 10000;

OTA_Update otaUpdater("soar-tracker", "TP-Link_BCBD", "10673881");
SOAR_Lora lora("7", "5", "905000000", 500);  // LoRa
SOAR_GPS gps(1, RX, TX);


class AutomatedTelemetry
{
  private:
    int _repeat_status = 0; // 0: no repeat, 1: repeat all, 2: repeat altitude, 3: repeat distance, 4: repeat status
    uint32_t _last_repeat = 0;
    uint32_t _repeat_interval = 1000;
  public:
    AutomatedTelemetry(uint32_t repeat_interval, int init_status=0){
      _repeat_interval = repeat_interval;
      _repeat_status = init_status;
    }
    void SetRepeatStatus(int status){
      _repeat_status = status;
    }
    void Handle(const char* gps_nmea){
      if(_repeat_status == 0) return;
      //Check for repeat interval
      if(millis()-_last_repeat < _repeat_interval) return;
      
      switch(_repeat_status){
        case 1:
          //GPS, RRC3 and IMU data
          /*
          |`IS`|All info single | `IS{GPS NMEA string};{altitude-float}{LinearX-float}{LinearY-float}{LinearZ-float}{GravityX-float}{GravityY-float}{GravityZ-float}{GyroX-float}{GyroY-float}{GyroZ-float}{T-time}`| All info response|
          */
          lora.beginPacket();
          lora.sendChar("GS");
          lora.sendChar(gps_nmea);
          lora.endPacketWTime(6);
          break;
        default:
          break;
      }
      _last_repeat = millis();
    }
};
AutomatedTelemetry autoTelemetry(500, 1);

void setup() {

  Serial.begin(115200);

  gps.setup();

  Serial.println("Setup completed");
  otaUpdater.Setup();
  lora.begin();
  lora.stringPacketWTime("WU",6);
}

void loop() {
  
  char gps_nmea[1000];
  bool gps_ready;
  bool gps_failed;
  gps.GET_NMEA(gps_nmea, &gps_ready, &gps_failed);

  int address, length, rssi, snr;
  byte *data;
  bool lora_available = lora.read(&address, &length, &data, &rssi, &snr);
  if (lora_available && length > 0 && lora.checkChecksum(data, length)) // A command is typically 2 bytes
  {

    bool valid_command = true;
    if (length > 2) {
      char command[3] = {data[0], data[1], '\0'};
      if(!strcmp(command, "PI")){
        lora.beginPacket();
        lora.stringPacketWTime("PO",6);
      }
      else if(!strcmp(command, "GS")){
        lora.beginPacket();
        lora.sendChar("GS");
        lora.sendChar(gps_nmea);
        lora.endPacketWTime(6);
      }
      else if(!strcmp(command, "GR")){
        autoTelemetry.SetRepeatStatus(1);
      }
      else{
        valid_command = false;
      }
    } else{
      valid_command = false;
    }

    if(!valid_command){
      lora.beginPacket();
      lora.sendChar("NH");
      for (int i = 0; i < length; i++) {
        lora.sendByte(data[i]);
      }
      lora.endPacketWTime(6);
    }
  }

  otaUpdater.Handle();
  lora.handleQueue();
  autoTelemetry.Handle(gps_nmea);
}
