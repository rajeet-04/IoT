/**
 * WebSocketClient - ESP32 WebSocket Client with TLS, Auth, and Keepalive
 * 
 * Uses the built-in esp_websocket_client from arduino-esp32.
 * Supports WSS (WebSocket Secure) with device token authentication.
 * 
 * Wiring:
 *   - No special wiring required (uses built-in ESP32 WiFi + TLS)
 *   - Ensure backend URL uses wss:// (WebSocket Secure)
 * 
 * Usage:
 *   #include "websocket_client.h"
 *   
 *   const char* backendUrl = BACKEND_URL;  // e.g., "iot-backend-abc123.onrender.com"
 *   const char* deviceToken = DEVICE_TOKEN; // From device registration
 *   
 *   WebSocketClient wsClient(backendUrl, deviceToken);
 *   
 *   void setup() {
 *     wsClient.onMessage([](JsonDocument& doc) {
 *       Serial.println(doc["type"].as<String>());
 *     });
 *     wsClient.connect();
 *   }
 *   
 *   void loop() {
 *     wsClient.tick();
 *     delay(1000);
 *   }
 */

#pragma once

#include <Arduino.h>
#undef IPADDR_NONE
#undef INADDR_NONE
#include <esp_websocket_client.h>
#include <ArduinoJson.h>
#include <functional>

class WebSocketClient {
public:
    /**
     * Constructor
     * @param backendUrl Base URL of the backend (e.g., "iot-backend-abc123.onrender.com")
     * @param deviceToken Device authentication token from registration
     */
    WebSocketClient(const char* backendUrl, const char* deviceToken);

    /**
     * Destructor - cleans up connection
     */
    ~WebSocketClient();

    /**
     * Connect to the WebSocket server
     * @return true if connection initiated successfully
     */
    bool connect();

    /**
     * Disconnect from the WebSocket server
     */
    void disconnect();

    /**
     * Send a JSON document as a WebSocket message
     * @param doc JSON document to send
     * @return true if message sent successfully
     */
    bool sendJson(JsonDocument& doc);

    /**
     * Check if connected to the server
     * @return true if WebSocket is connected
     */
    bool isConnected();

    /**
     * Register callback for incoming messages
     * @param callback Function to call with parsed JSON document
     */
    void onMessage(std::function<void(JsonDocument&)> callback);

    /**
     * Call this periodically in loop()
     * Handles heartbeat timing and connection polling
     */
    void tick();

    /**
     * Get the current connection status
     * @return String describing current state
     */
    const char* getStatus();

private:
    esp_websocket_client_handle_t _client;
    String _backendUrl;
    String _deviceToken;
    bool _connected;
    unsigned long _lastHeartbeat;
    unsigned long _heartbeatInterval;    // 30 seconds
    unsigned long _lastCheckTime;
    unsigned long _checkInterval;
    std::function<void(JsonDocument&)> _messageCallback;

    static void websocketEventHandler(void* handler_args, esp_event_base_t base, 
                                       int32_t event_id, void* event_data);
    
    void handleConnected();
    void handleDisconnected();
    void handleMessage(char* data, size_t len);
    void handleError();
    void sendHeartbeat();
};

/**
 * Backend URL Configuration
 * 
 * The BACKEND_URL MUST be provided via build flags.
 * Format: hostname only (wss:// is added automatically)
 * Example: "iot-backend-abc123.onrender.com"
 * 
 * DO NOT include protocol prefix (wss://) - it's added automatically.
 * DO NOT include path (/ws) - it's added automatically.
 * 
 * Set in platformio.ini:
 *   build_flags = -DBACKEND_URL='"your-backend.onrender.com"'
 * 
 * Or set environment variable:
 *   export BACKEND_URL="your-backend.onrender.com"
 */
