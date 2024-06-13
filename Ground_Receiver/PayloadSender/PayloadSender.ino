#include "_config.h"
#include "ota_update.h"

#include "SOAR_Lora.h"
#include "utils.h"


OTA_Update otaUpdater("soar-l1-receiver", "TP-Link_BCBD", "10673881");
SOAR_Lora lora("6", "5", "905000000", 500);  // LoRa

void decodeChar(char *output, const byte *packetBuffer, int bufferLength) {
    int checksum = 0;
    for (int i = 0; i < bufferLength; i++) {
        output[i] = (char)packetBuffer[i];
        checksum += packetBuffer[i];
    }
    output[bufferLength] = '\0'; // Null-terminate the string
    // The checksum can be used for validation if needed
    Serial.print("Decoded checksum: ");
    Serial.println(checksum);
}

void setup() {

  Serial.begin(115200);


  Serial.println("Setup completed");
  otaUpdater.Setup();
  lora.begin();
  lora.stringPacketWTime("WU",7);
  // My idea
  // lora.stringPacketWTime("GS", 7);
}

void loop() {


  // LoRa Beginif
  int address, length, rssi, snr; 
  byte *data;
  bool lora_available = lora.read(&address, &length, &data, &rssi, &snr);
  if (lora_available && length > 0 && lora.checkChecksum(data, length)) // A command is typically 2 bytes
  {
    char decodedString[length];


    bool valid_command = true;
    if (length > 2) {
      char command[3] = {data[0], data[1], '\0'};
      if(!strcmp(command, "PI")){
        lora.beginPacket();
        lora.stringPacketWTime("PO",6);
      }
      else if(!strcmp(command, "GS")){
        decodeChar(decodedString, data, length);
        Serial.println(decodedString);
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
  // LoRa Endif

  otaUpdater.Handle();
  lora.handleQueue();
}
