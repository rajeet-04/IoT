/**
 * WebSocketClient - Implementation
 *
 * Uses links2004/WebSockets over WiFiClientSecure.
 * TLS certificate verification is disabled (setInsecure) because:
 *  - The backend is a known, trusted private endpoint (Render.com).
 *  - The esp_websocket_client IDF approach has unstable cert-bundle API
 *    in the Arduino V3 / ESP-IDF 5.x wrapper.
 */

#include "websocket_client.h"

// ─── Static trampoline ──────────────────────────────────────────────────────
static WebSocketClient* _instance = nullptr;

static void _wsEventHandler(WStype_t type, uint8_t* payload, size_t length) {
    if (_instance) {
        _instance->handleEvent(type, payload, length);
    }
}

// ─── Constructor / Destructor ────────────────────────────────────────────────
WebSocketClient::WebSocketClient(const char* backendUrl, const char* deviceToken)
    : _backendUrl(backendUrl)
    , _deviceToken(deviceToken)
    , _connected(false)
    , _lastHeartbeat(0)
    , _heartbeatInterval(30000)
{
    _instance = this;
}

WebSocketClient::~WebSocketClient() {
    disconnect();
    _instance = nullptr;
}

// ─── connect() ───────────────────────────────────────────────────────────────
bool WebSocketClient::connect() {
    Serial.printf("[WS] Connecting to wss://%s/ws\n", _backendUrl.c_str());

    // Build the Authorization header
    String authHeader = "Authorization: Bearer " + _deviceToken;

    // Configure WSS with insecure TLS (no CA verification needed for private endpoint)
    _ws.beginSSL(_backendUrl.c_str(), 443, "/ws", "", "");
    _ws.setExtraHeaders(authHeader.c_str());
    _ws.onEvent(_wsEventHandler);
    _ws.setReconnectInterval(5000);      // retry every 5 s on disconnect
    _ws.enableHeartbeat(25000, 3000, 2); // ping every 25 s, pong timeout 3 s, 2 retries

    Serial.println("[WS] Connection initiated (WSS / insecure)");
    return true;
}

// ─── disconnect() ────────────────────────────────────────────────────────────
void WebSocketClient::disconnect() {
    _ws.disconnect();
    _connected = false;
}

// ─── sendJson() ──────────────────────────────────────────────────────────────
bool WebSocketClient::sendJson(JsonDocument& doc) {
    if (!_connected) {
        Serial.println("[WS] Cannot send – not connected");
        return false;
    }

    String output;
    serializeJson(doc, output);

    bool ok = _ws.sendTXT(output);
    if (ok) {
        Serial.printf("[WS] Sent: %s\n", output.c_str());
    } else {
        Serial.println("[WS] Send failed");
    }
    return ok;
}

// ─── isConnected() ───────────────────────────────────────────────────────────
bool WebSocketClient::isConnected() {
    return _connected;
}

// ─── onMessage() ─────────────────────────────────────────────────────────────
void WebSocketClient::onMessage(std::function<void(JsonDocument&)> callback) {
    _messageCallback = callback;
}

// ─── tick() ──────────────────────────────────────────────────────────────────
void WebSocketClient::tick() {
    _ws.loop();

    if (_connected) {
        unsigned long now = millis();
        if (now - _lastHeartbeat >= _heartbeatInterval) {
            _lastHeartbeat = now;
            sendHeartbeat();
        }
    }
}

// ─── getStatus() ─────────────────────────────────────────────────────────────
const char* WebSocketClient::getStatus() {
    return _connected ? "connected" : "disconnected";
}

// ─── handleEvent() ───────────────────────────────────────────────────────────
void WebSocketClient::handleEvent(WStype_t type, uint8_t* payload, size_t length) {
    switch (type) {
        case WStype_CONNECTED:
            _connected = true;
            _lastHeartbeat = millis();
            Serial.printf("[WS] Connected to backend! URL: %s\n", (char*)payload);
            sendHeartbeat(); // Send initial state report
            break;

        case WStype_DISCONNECTED:
            _connected = false;
            Serial.println("[WS] Disconnected from backend");
            break;

        case WStype_TEXT:
            Serial.printf("[WS] Received (%d bytes): %.*s\n", length, length, (char*)payload);
            if (_messageCallback) {
                JsonDocument doc;
                DeserializationError err = deserializeJson(doc, payload, length);
                if (!err) {
                    _messageCallback(doc);
                } else {
                    Serial.printf("[WS] JSON parse error: %s\n", err.c_str());
                }
            }
            break;

        case WStype_ERROR:
            Serial.println("[WS] WebSocket error");
            break;

        case WStype_PING:
            Serial.println("[WS] Ping received");
            break;

        case WStype_PONG:
            Serial.println("[WS] Pong received");
            break;

        default:
            break;
    }
}

// ─── sendHeartbeat() ─────────────────────────────────────────────────────────
void WebSocketClient::sendHeartbeat() {
    JsonDocument hb;
    hb["type"]     = "heartbeat";
    hb["deviceId"] = _deviceToken;
    hb["uptime"]   = millis();

    if (sendJson(hb)) {
        Serial.println("[WS] Heartbeat sent");
    } else {
        Serial.println("[WS] Heartbeat failed");
    }
}
