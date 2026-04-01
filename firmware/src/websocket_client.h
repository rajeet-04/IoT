/**
 * WebSocketClient - ESP32 WebSocket Client with TLS, Auth, and Keepalive
 *
 * Uses the links2004/WebSockets library over WiFiClientSecure.
 * Supports WSS (WebSocket Secure) with device token authentication.
 *
 * Usage:
 *   WebSocketClient wsClient(BACKEND_URL, DEVICE_TOKEN);
 *   wsClient.onMessage([](JsonDocument& doc) { ... });
 *   wsClient.connect();
 *   // call wsClient.tick() in loop()
 */

#pragma once

#include <Arduino.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <functional>

class WebSocketClient {
public:
    WebSocketClient(const char* backendUrl, const char* deviceToken);
    ~WebSocketClient();

    bool connect();
    void disconnect();
    bool sendJson(JsonDocument& doc);
    bool isConnected();
    void onMessage(std::function<void(JsonDocument&)> callback);
    void tick();
    const char* getStatus();

    // Called internally by the static event handler
    void handleEvent(WStype_t type, uint8_t* payload, size_t length);

private:
    WebSocketsClient _ws;
    String _backendUrl;
    String _deviceToken;
    bool _connected;
    unsigned long _lastHeartbeat;
    unsigned long _heartbeatInterval;   // 30 seconds
    std::function<void(JsonDocument&)> _messageCallback;

    void sendHeartbeat();
};
