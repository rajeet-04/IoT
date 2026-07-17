#include "ultrasonic_sensor.h"

namespace {
constexpr unsigned long ECHO_TIMEOUT_US = 30000UL; // About 5 m maximum range
constexpr float MIN_DISTANCE_CM = 2.0f;            // HC-SR04 physical minimum
constexpr float MAX_DISTANCE_CM = 400.0f;          // HC-SR04 rated maximum
}

UltrasonicSensor::UltrasonicSensor(uint8_t triggerPin, uint8_t echoPin)
    : _triggerPin(triggerPin), _echoPin(echoPin), _movementThresholdCm(10.0f),
      _previousDistanceCm(-1.0f), _hasPreviousReading(false), _motionEnabled(true) {}

void UltrasonicSensor::begin() {
    pinMode(_triggerPin, OUTPUT);
    pinMode(_echoPin, INPUT);
    digitalWrite(_triggerPin, LOW);
    Serial.printf("[Ultrasonic] Initialized: TRIG GPIO %u, ECHO GPIO %u\n",
                  _triggerPin, _echoPin);
}

float UltrasonicSensor::readDistanceCm() {
    digitalWrite(_triggerPin, LOW);
    delayMicroseconds(2);
    digitalWrite(_triggerPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(_triggerPin, LOW);

    const unsigned long duration = pulseIn(_echoPin, HIGH, ECHO_TIMEOUT_US);
    if (duration == 0) return -1.0f;

    const float distanceCm = duration / 58.0f;
    if (distanceCm < MIN_DISTANCE_CM || distanceCm > MAX_DISTANCE_CM) {
        return -1.0f;
    }

    return distanceCm;
}

void UltrasonicSensor::addReading(JsonDocument& doc) {
    const float distanceCm = readDistanceCm();
    doc["distanceCm"] = distanceCm;
    doc["distanceValid"] = distanceCm >= 0.0f;
}

bool UltrasonicSensor::detectMovement(float& distanceCm) {
    distanceCm = readDistanceCm();
    if (distanceCm < 0.0f) {
        // A floating/disconnected echo pin often creates tiny random pulses.
        // Do not compare a later real reading to a stale baseline.
        _hasPreviousReading = false;
        return false;
    }

    const bool moved = _motionEnabled && _hasPreviousReading &&
        fabsf(distanceCm - _previousDistanceCm) >= _movementThresholdCm;
    _previousDistanceCm = distanceCm;
    _hasPreviousReading = true;
    return moved;
}

void UltrasonicSensor::setMovementThresholdCm(float thresholdCm) {
    if (thresholdCm >= 1.0f && thresholdCm <= 400.0f) {
        _movementThresholdCm = thresholdCm;
    }
}
