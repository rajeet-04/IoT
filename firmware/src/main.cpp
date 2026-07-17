/**
 * ESP32 IoT Device Firmware - Main Entry Point
 * 
 * IoT Device Control Platform - ESP32 Firmware
 * Connects to WiFi, establishes WSS connection to backend,
 * and responds to relay control commands.
 * 
 * Hardware Requirements:
 * - ESP32 Dev Module (or compatible)
 * - SRD-05VDC-SL-C relay module (with flyback diode protection)
 * 
 * Pin Configuration:
 * - GPIO 2: Relay control (D2)
 * 
 * Environment Variables (via build flags):
 * - WIFI_SSID: WiFi network name
 * - WIFI_PASSWORD: WiFi network password
 * - BACKEND_URL: Backend server hostname (e.g., iot-backend-abc123.onrender.com)
 * - DEVICE_TOKEN: Device authentication token from registration
 */

#include <Arduino.h>
#include <WiFiManager.h>
#include <websocket_client.h>
#include <relay_controller.h>
#include <ultrasonic_sensor.h>

// HC-SR04-style ultrasonic sensor pins.
// ECHO must be level-shifted/divided to 3.3V before entering the ESP32.
constexpr uint8_t ULTRASONIC_TRIG_PIN = 18;
constexpr uint8_t ULTRASONIC_ECHO_PIN = 19;

// ============================================================================
// CREDENTIAL CONFIGURATION
// These MUST be provided via build flags - DO NOT hardcode!
// ============================================================================

#ifndef WIFI_SSID
#error "WiFi SSID not configured. Set WIFI_SSID in platformio.ini or environment."
#endif

#ifndef WIFI_PASSWORD
#error "WiFi Password not configured. Set WIFI_PASSWORD in platformio.ini or environment."
#endif

#ifndef BACKEND_URL
#error "Backend URL not configured. Set BACKEND_URL in platformio.ini or environment."
#endif

#ifndef DEVICE_TOKEN
#error "Device Token not configured. Set DEVICE_TOKEN in platformio.ini or environment."
#endif

// ============================================================================
// GLOBAL INSTANCES
// ============================================================================

WiFiManager* wifiManager = nullptr;
WebSocketClient* wsClient = nullptr;
RelayController* relay = nullptr;
UltrasonicSensor* ultrasonic = nullptr;

// ============================================================================
// SETUP
// ============================================================================

void setup() {
    // Initialize serial communication
    Serial.begin(115200);
    delay(1000);  // Give serial time to initialize
    
    Serial.println();
    Serial.println("===========================================");
    Serial.println("  ESP32 IoT Device - IoT Control Platform");
    Serial.println("===========================================");
    Serial.printf("  Device Token: %.8s...\n", DEVICE_TOKEN);
    Serial.printf("  Backend URL:  %s\n", BACKEND_URL);
    Serial.println("===========================================");
    Serial.println();

    // =========================================================================
    // STEP 1: Initialize Relay FIRST (safe state before any network)
    // =========================================================================
    Serial.println("[Setup] Initializing Relay Controller...");
    relay = new RelayController(2);  // GPIO 2 (D2)
    relay->begin();
    relay->setDeviceToken(DEVICE_TOKEN);
    Serial.println("[Setup] Relay initialized in SAFE state (OFF)");
    Serial.println();

    // Initialize ultrasonic sensor
    Serial.println("[Setup] Initializing ultrasonic sensor...");
    ultrasonic = new UltrasonicSensor(ULTRASONIC_TRIG_PIN, ULTRASONIC_ECHO_PIN);
    ultrasonic->begin();
    Serial.println();

    // =========================================================================
    // STEP 2: Initialize WiFi
    // =========================================================================
    Serial.println("[Setup] Initializing WiFi...");
    wifiManager = new WiFiManager(WIFI_SSID, WIFI_PASSWORD);
    
    // Register disconnect callback
    wifiManager->onDisconnect([]() {
        Serial.println("[Callback] WiFi disconnected!");
    });

    // Connect to WiFi
    if (wifiManager->connect()) {
        Serial.printf("[Setup] WiFi connected! IP: %s\n", 
                     wifiManager->getLocalIP().toString().c_str());
        Serial.printf("[Setup] Signal strength: %d dBm\n", 
                     wifiManager->getSignalStrength());
    } else {
        Serial.println("[Setup] WiFi connection failed - will retry automatically");
    }

    // Enable auto-reconnect
    wifiManager->beginAutoReconnect();
    Serial.println();

    // =========================================================================
    // STEP 3: Initialize WebSocket Client
    // =========================================================================
    Serial.println("[Setup] Initializing WebSocket client...");
    wsClient = new WebSocketClient(BACKEND_URL, DEVICE_TOKEN);

    // Register message handler for incoming commands
    wsClient->onMessage([](JsonDocument& msg) {
        const char* type = msg["type"] | "unknown";
        Serial.printf("[WS] Message type: %s\n", type);
        
        if (strcmp(type, "command") == 0) {
            const char* action = msg["action"] | "";
            const char* commandId = msg["commandId"] | "unknown";
            int state = msg["state"] | -1;
            
            Serial.printf("[WS] Command: action=%s, commandId=%s, state=%d\n", 
                         action, commandId, state);
            
            bool newState = false;
            bool validAction = false;
            
            if (strcmp(action, "set_relay") == 0) {
                if (state == 0 || state == 1) {
                    newState = (state == 1);
                    validAction = true;
                } else {
                    // Invalid state value
                    JsonDocument error;
                    error["type"] = "error";
                    error["code"] = "INVALID_STATE";
                    error["message"] = "State must be 0 or 1 for set_relay";
                    wsClient->sendJson(error);
                    Serial.println("[WS] Invalid state value received");
                    return;
                }
            } else if (strcmp(action, "turn_on") == 0) {
                newState = true;
                validAction = true;
            } else if (strcmp(action, "turn_off") == 0) {
                newState = false;
                validAction = true;
            }

            if (validAction) {
                relay->setState(newState);
                
                // Send acknowledgment
                JsonDocument ack;
                ack["type"] = "ack";
                ack["commandId"] = commandId;
                ack["status"] = "success";
                ack["relayState"] = newState ? 1 : 0;
                
                if (wsClient->sendJson(ack)) {
                    Serial.printf("[WS] ACK sent for command %s\n", commandId);
                } else {
                    Serial.println("[WS] Failed to send ACK");
                }
                
                // Send state report after relay change
                delay(50);  // Brief delay to ensure relay has switched
                JsonDocument stateReport = relay->getStateJson();
                ultrasonic->addReading(stateReport);
                if (wsClient->sendJson(stateReport)) {
                    Serial.println("[WS] State report sent");
                }
                
                Serial.printf("[Relay] Action %s: state changed to %s\n", action, newState ? "ON" : "OFF");
            } else if (strcmp(action, "ping") == 0) {
                Serial.println("[WS] Server ping received");
            } else {
                // Unknown action
                JsonDocument error;
                error["type"] = "error";
                error["code"] = "UNKNOWN_ACTION";
                error["message"] = action;
                wsClient->sendJson(error);
                Serial.printf("[WS] Unknown action: %s\n", action);
            }
        } else if (strcmp(type, "config") == 0) {
            if (!msg["movementThresholdCm"].isNull()) {
                ultrasonic->setMovementThresholdCm(msg["movementThresholdCm"] | 10.0f);
            }
            if (!msg["motionEnabled"].isNull()) {
                const bool enabled = msg["motionEnabled"] | true;
                ultrasonic->setMotionEnabled(enabled);
            }
            Serial.printf("[WS] Sensor settings applied: threshold=%.1f cm\n",
                          ultrasonic->getMovementThresholdCm());
        } else if (strcmp(type, "welcome") == 0) {
            const char* deviceId = msg["deviceId"] | "unknown";
            Serial.printf("[WS] Server welcomed us as device: %s\n", deviceId);
            
            // Apply initial state from server if present
            if (!msg["relayState"].isNull()) {
                int initialState = msg["relayState"];
                bool newState = (initialState == 1);
                relay->setState(newState);
                Serial.printf("[Relay] Init state applied from server: %s\n", newState ? "ON" : "OFF");
            }
        } else {
            Serial.printf("[WS] Unknown message type: %s\n", type);
        }
    });

    // Connect to WebSocket server
    Serial.println("[Setup] Connecting to WebSocket server...");
    if (wsClient->connect()) {
        Serial.println("[Setup] WebSocket connection initiated");
    } else {
        Serial.println("[Setup] WebSocket connection failed - will retry automatically");
    }

    // Send an initial sensor reading after the connection is established.
    if (wsClient->isConnected()) {
        JsonDocument stateReport = relay->getStateJson();
        ultrasonic->addReading(stateReport);
        wsClient->sendJson(stateReport);
    }

    Serial.println();
    Serial.println("[Setup] Initialization complete!");
    Serial.println("[Setup] Device is ready to receive commands.");
    Serial.printf("[Setup] Initial relay state: %s\n", relay->getState() ? "ON" : "OFF");
    Serial.println();
}

// ============================================================================
// MAIN LOOP
// ============================================================================

void loop() {
    // Handle WiFi connection (auto-reconnect)
    if (wifiManager != nullptr) {
        wifiManager->tick();
    }

    // Handle WebSocket (heartbeat, auto-reconnect)
    if (wsClient != nullptr) {
        wsClient->tick();
    }

    // Ultrasonic motion has priority over the current relay state.
    static unsigned long lastSensorRead = 0;
    if (ultrasonic != nullptr && relay != nullptr && wsClient != nullptr &&
        millis() - lastSensorRead >= 250) {
        lastSensorRead = millis();
        float distanceCm = -1.0f;
        if (ultrasonic->detectMovement(distanceCm)) {
            relay->setOn();
            JsonDocument report = relay->getStateJson();
            report["event"] = "movement_detected";
            report["distanceCm"] = distanceCm;
            report["distanceValid"] = true;
            wsClient->sendJson(report);
            Serial.printf("[Motion] Movement detected at %.1f cm; relay ON\n", distanceCm);
        }
    }

    // Small delay to prevent watchdog issues
    delay(100);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Print system information to serial
 * Useful for debugging
 */
void printSystemInfo() {
    Serial.println("--- System Information ---");
    Serial.printf("Chip Model: %s\n", ESP.getChipModel());
    Serial.printf("Chip Revision: %d\n", ESP.getChipRevision());
    Serial.printf("CPU Frequency: %d MHz\n", ESP.getCpuFreqMHz());
    Serial.printf("Flash Size: %d bytes\n", ESP.getFlashChipSize());
    Serial.printf("Free Heap: %d bytes\n", ESP.getFreeHeap());
    Serial.printf("Cycle Count: %lu\n", ESP.getCycleCount());
    Serial.printf("Uptime: %lu ms\n", millis());
    Serial.printf("Relay State: %s\n", relay && relay->getState() ? "ON" : "OFF");
    Serial.println("------------------------");
}
