#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>

class UltrasonicSensor {
public:
    UltrasonicSensor(uint8_t triggerPin, uint8_t echoPin);

    void begin();
    float readDistanceCm();
    void addReading(JsonDocument& doc);
    bool detectMovement(float& distanceCm);
    void setMovementThresholdCm(float thresholdCm);
    void setMotionEnabled(bool enabled) { _motionEnabled = enabled; }
    float getMovementThresholdCm() const { return _movementThresholdCm; }

private:
    uint8_t _triggerPin;
    uint8_t _echoPin;
    float _movementThresholdCm;
    float _previousDistanceCm;
    bool _hasPreviousReading;
    bool _motionEnabled;
};
