/**
 * RelayController - Implementation
 * 
 * Provides safe relay control with:
 * - Safe boot state (OFF by default)
 * - Non-blocking operation
 * - JSON state reporting
 * - Detailed serial logging
 */

#include "relay_controller.h"

RelayController::RelayController(int gpioPin)
    : _gpioPin(gpioPin)
    , _state(false)  // Safe default: OFF
    , _deviceToken("")
{
}

void RelayController::begin() {
    // Initialize GPIO as output
    pinMode(_gpioPin, OUTPUT);
    
    // Ensure safe state: relay OFF (GPIO LOW)
    digitalWrite(_gpioPin, LOW);
    _state = false;
    
    Serial.println("===========================================");
    Serial.println("  Relay Controller Initialized");
    Serial.println("===========================================");
    Serial.printf("  Pin: GPIO %d\n", _gpioPin);
    Serial.printf("  Initial State: OFF (SAFE)\n");
    Serial.printf("  Safe State: Relay defaults to OFF on boot\n");
    Serial.println("===========================================");
    Serial.println();
}

void RelayController::setOn() {
    digitalWrite(_gpioPin, HIGH);
    _state = true;
    Serial.println("[RELAY] ON");
}

void RelayController::setOff() {
    digitalWrite(_gpioPin, LOW);
    _state = false;
    Serial.println("[RELAY] OFF");
}

void RelayController::setState(bool on) {
    if (on) {
        setOn();
    } else {
        setOff();
    }
}

bool RelayController::getState() const {
    return _state;
}

JsonDocument RelayController::getStateJson() {
    StaticJsonDocument<128> doc;
    doc["type"] = "state_report";
    doc["relay"] = _state ? 1 : 0;  // 1 = ON, 0 = OFF (matching backend expectation)
    doc["relayState"] = _state;       // Boolean for clarity
    doc["deviceId"] = _deviceToken;
    doc["uptime"] = millis();
    doc["timestamp"] = millis();
    return doc;
}

void RelayController::setDeviceToken(const char* token) {
    _deviceToken = token;
}
