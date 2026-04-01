/**
 * ESP32 IoT Device Firmware - Single File Version
 * 
 * IoT Device Control Platform - ESP32 Firmware
 * Connects to WiFi, establishes WSS connection to backend,
 * and responds to relay control commands.
 * 
 * Hardware Requirements:
 * - ESP32 Dev Module (or compatible)
 * - SRD-05VDC-SL-C relay module
 * 
 * Pin Configuration:
 * - GPIO 26: Relay control (default)
 * 
 * Instructions:
 * 1. Install arduino-esp32 core (v3.x) via Board Manager
 * 2. Install ArduinoJson library (v7.x) via Library Manager
 * 3. Configure credentials below
 * 4. Upload to ESP32
 */

#include <Arduino.h>
#include <WiFi.h>
#include <esp_websocket_client.h>
#include <ArduinoJson.h>
#include <esp_event.h>

// ============================================================================
// CREDENTIAL CONFIGURATION - EDIT THESE VALUES
// ============================================================================

const char* WIFI_SSID = "YourWiFiSSID";
const char* WIFI_PASSWORD = "YourWiFiPassword";
const char* BACKEND_URL = "your-backend.onrender.com";  // Domain only (no https://)
const char* DEVICE_TOKEN = "your-device-token-from-registration";

// Relay pin configuration
const int RELAY_PIN = 26;

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

bool relayState = false;
unsigned long lastHeartbeat = 0;
unsigned long lastReconnectAttempt = 0;
bool wsConnected = false;

// WebSocket client handle
esp_websocket_client_handle_t wsClient = NULL;

// ============================================================================
// RELAY CONTROL FUNCTIONS
// ============================================================================

void initRelay() {
    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, LOW);  // Start OFF (safe state)
    Serial.println("[Relay] Initialized on GPIO " + String(RELAY_PIN) + " - STATE: OFF");
}

void setRelayState(bool state) {
    relayState = state;
    digitalWrite(RELAY_PIN, state ? HIGH : LOW);
    Serial.println("[Relay] State changed to: " + String(state ? "ON" : "OFF"));
}

void sendStateReport() {
    if (!wsConnected || wsClient == NULL) return;
    
    JsonDocument doc;
    doc["type"] = "state_report";
    doc["relay"] = relayState;
    doc["timestamp"] = millis();
    
    String output;
    serializeJson(doc, output);
    esp_websocket_client_send_text(wsClient, output.c_str(), output.length(), portMAX_DELAY);
    Serial.println("[WS] State report sent: " + output);
}

void sendAck(const char* commandId, bool success, bool relayStateVal) {
    if (!wsConnected || wsClient == NULL) return;
    
    JsonDocument doc;
    doc["type"] = "ack";
    doc["commandId"] = commandId;
    doc["status"] = success ? "success" : "error";
    doc["relayState"] = relayStateVal;
    
    String output;
    serializeJson(doc, output);
    esp_websocket_client_send_text(wsClient, output.c_str(), output.length(), portMAX_DELAY);
    Serial.println("[WS] ACK sent: " + output);
}

// ============================================================================
// WIFI FUNCTIONS
// ============================================================================

void connectWiFi() {
    Serial.println("[WiFi] Connecting to SSID: " + String(WIFI_SSID));
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n[WiFi] Connected! IP: " + WiFi.localIP().toString());
        Serial.println("[WiFi] Signal strength: " + String(WiFi.RSSI()) + " dBm");
    } else {
        Serial.println("\n[WiFi] Connection failed");
    }
}

// ============================================================================
// WEBSOCKET EVENT HANDLER
// ============================================================================

static void websocket_event_handler(void* handler_args, esp_event_base_t* base, int32_t event_id, void* event_data) {
    esp_websocket_event_data_t* data = (esp_websocket_event_data_t*)event_data;
    
    switch (event_id) {
        case WEBSOCKET_EVENT_CONNECTED:
            Serial.println("[WS] Connected to server");
            wsConnected = true;
            // Send initial state report
            sendStateReport();
            break;
            
        case WEBSOCKET_EVENT_DISCONNECTED:
            Serial.println("[WS] Disconnected");
            wsConnected = false;
            break;
            
        case WEBSOCKET_EVENT_DATA:
            Serial.println("[WS] Received: " + String(data->data_ptr, data->data_len));
            
            {
                JsonDocument doc;
                DeserializationError error = deserializeJson(doc, data->data_ptr);
                
                if (error) {
                    Serial.println("[WS] JSON parse error");
                    return;
                }
                
                const char* type = doc["type"] | "unknown";
                
                if (strcmp(type, "command") == 0) {
                    const char* action = doc["action"] | "";
                    const char* commandId = doc["commandId"] | "unknown";
                    
                    Serial.println("[WS] Command: " + String(action));
                    
                    if (strcmp(action, "turn_on") == 0) {
                        setRelayState(true);
                        sendAck(commandId, true, true);
                    } 
                    else if (strcmp(action, "turn_off") == 0) {
                        setRelayState(false);
                        sendAck(commandId, true, false);
                    }
                    else if (strcmp(action, "toggle") == 0) {
                        setRelayState(!relayState);
                        sendAck(commandId, true, relayState);
                    }
                    else {
                        Serial.println("[WS] Unknown action: " + String(action));
                        sendAck(commandId, false, relayState);
                    }
                    
                    delay(50);
                    sendStateReport();
                }
                else if (strcmp(type, "welcome") == 0) {
                    Serial.println("[WS] Server welcomed device");
                }
            }
            break;
            
        case WEBSOCKET_EVENT_ERROR:
            Serial.println("[WS] Error");
            wsConnected = false;
            break;
            
        default:
            break;
    }
}

// ============================================================================
// WEBSOCKET FUNCTIONS
// ============================================================================

void connectWebSocket() {
    if (wsClient != NULL) {
        esp_websocket_client_stop(wsClient);
        esp_websocket_client_destroy(wsClient);
        wsClient = NULL;
    }
    
    // Build full WSS URL
    String url = "wss://" + String(BACKEND_URL) + "/ws";
    
    Serial.println("[WS] Connecting to " + url);
    
    esp_websocket_client_config_t ws_cfg = {
        .uri = url.c_str(),
        .disable_auto_reconnect = false,
        .reconnect_timeout_ms = 5000,
        .ping_interval_sec = 30,
    };
    
    wsClient = esp_websocket_client_init(&ws_cfg);
    
    // Set authorization header
    String authHeader = "Authorization: Bearer " + String(DEVICE_TOKEN);
    esp_websocket_client_set_headers(wsClient, authHeader.c_str());
    
    // Register event handler
    esp_websocket_client_register_events(wsClient, WEBSOCKET_EVENT_ANY, websocket_event_handler, NULL);
    
    // Start the WebSocket connection
    esp_err_t err = esp_websocket_client_start(wsClient);
    if (err != ESP_OK) {
        Serial.println("[WS] Failed to start: " + String(err));
    }
}

// ============================================================================
// HEARTBEAT
// ============================================================================

void sendHeartbeat() {
    if (!wsConnected || wsClient == NULL) return;
    
    JsonDocument doc;
    doc["type"] = "heartbeat";
    doc["uptime"] = millis();
    
    String output;
    serializeJson(doc, output);
    esp_websocket_client_send_text(wsClient, output.c_str(), output.length(), portMAX_DELAY);
    
    Serial.println("[WS] Heartbeat sent");
}

// ============================================================================
// SETUP
// ============================================================================

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println();
    Serial.println("===========================================");
    Serial.println("  ESP32 IoT Device - IoT Control Platform");
    Serial.println("===========================================");
    Serial.println("  Device Token: " + String(DEVICE_TOKEN));
    Serial.println("  Backend URL:  " + String(BACKEND_URL));
    Serial.println("===========================================");
    Serial.println();
    
    // Initialize relay in safe state
    initRelay();
    
    // Connect to WiFi
    connectWiFi();
    
    // Initialize WebSocket
    connectWebSocket();
    
    Serial.println();
    Serial.println("[Setup] Initialization complete!");
    Serial.println("[Setup] Device ready to receive commands");
    Serial.println();
}

// ============================================================================
// MAIN LOOP
// ============================================================================

void loop() {
    unsigned long now = millis();
    
    // Note: esp_websocket_client runs in its own task, no need to call loop()
    
    // Check WiFi status and reconnect if needed
    if (WiFi.status() != WL_CONNECTED) {
        if (now - lastReconnectAttempt > 5000) {
            Serial.println("[WiFi] Reconnecting...");
            connectWiFi();
            lastReconnectAttempt = now;
        }
    }
    
    // Check WebSocket connection
    if (!wsConnected && WiFi.status() == WL_CONNECTED) {
        if (now - lastReconnectAttempt > 5000) {
            Serial.println("[WS] Reconnecting...");
            connectWebSocket();
            lastReconnectAttempt = now;
        }
    }
    
    // Send heartbeat every 30 seconds
    if (wsConnected && now - lastHeartbeat > 1000) {
        sendHeartbeat();
        lastHeartbeat = now;
    }
    
    delay(100);
}