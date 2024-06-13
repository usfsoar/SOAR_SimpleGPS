#include "SOAR_gps.h"

SOAR_GPS::SOAR_GPS(int serial_bus, int RX, int TX) : 
   RX_PIN(RX), TX_PIN(TX){
    GPSSerial = new HardwareSerial(serial_bus);
    GPS = new Adafruit_GPS(GPSSerial);
   }

void SOAR_GPS::setup(){
  #if !FAKE_GPS 
  GPSSerial->begin(9600, SERIAL_8N1, RX_PIN, TX_PIN);
  GPS->begin(9600);

  GPS->sendCommand(PMTK_SET_NMEA_OUTPUT_RMCONLY);
  GPS->sendCommand(PMTK_SET_NMEA_UPDATE_1HZ);
  GPS->sendCommand(PGCMD_ANTENNA);
  GPSSerial->println(PMTK_Q_RELEASE);
  #endif
  
}


void SOAR_GPS::GET_NMEA(char* nmea, bool *ready, bool *failed){
  #if FAKE_GPS
  char read = GPS->read();
  if(!GPS->newNMEAreceived()){
    *ready = false;
    return;
  }
  if (!GPS->parse(GPS->lastNMEA())){
    *failed = true;
    return;
  }

  char* gps_data = GPS->lastNMEA();
  #else
  *ready = true;
  *failed = false;
  char* gps_data = "$GNRMC, 181717.000,A,2805.5864,N,08210.5440,W,0.31,0.00,181123,,,A*6F";

  #endif

  int comas = 0;
  for(char *p = gps_data; *p != '\0'; p++){
    if(*p == ','){
      comas++;
      if(comas == 2){
        continue; // Skip copying the comma itself
      }
    }
    if(comas > 2 && comas < 7){
      *nmea++ = *p; // Copy data between the 7th and 10th commas
    } else if(comas >= 7){
      break; // Stop copying after the 9th comma
    }
  }
  *nmea = '\0'; // Null-terminate the NMEA string

}


  //    if (millis() - gps_repeat_focus_checkpoint > GPS_FOCUS_MAX) {
  //     // gps_repeat_focus = false;
  //     gps_repeat_focus_checkpoint = millis();
  //     lora.stringPacketWTime("GSFI");
  //     Serial.println("GPS Repeat Focus Timed Out");


