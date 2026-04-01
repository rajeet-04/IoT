/**
 * WebSocketClient - Implementation
 * 
 * Provides WebSocket connection with:
 * - WSS (TLS) support
 * - Device token authentication via Bearer header
 * - Ping/pong keepalive (10 second interval)
 * - Automatic reconnection
 * - Heartbeat messages (30 second interval)
 * - JSON message handling
 */

#include "websocket_client.h"

// Static instance pointer for event handler callback
static WebSocketClient* _instance = nullptr;

WebSocketClient::WebSocketClient(const char* backendUrl, const char* deviceToken)
    : _client(nullptr)
    , _backendUrl(backendUrl)
    , _deviceToken(deviceToken)
    , _connected(false)
    , _lastHeartbeat(0)
    , _heartbeatInterval(30000)    // 30 seconds
    , _lastCheckTime(0)
    , _checkInterval(1000)          // 1 second polling
{
    _instance = this;
}

WebSocketClient::~WebSocketClient() {
    disconnect();
    _instance = nullptr;
}

bool WebSocketClient::connect() {
    if (_client != nullptr) {
        Serial.println("[WS] Client already initialized");
        return false;
    }

    Serial.printf("[WS] Connecting to wss://%s/ws\n", _backendUrl.c_str());

    // Build WebSocket URI
    String wsUri = "wss://" + _backendUrl + "/ws";

    // Configure WebSocket client
    esp_websocket_client_config_t wsConfig = {};
    wsConfig.uri = wsUri.c_str();
    wsConfig.disable_auto_reconnect = false;
    wsConfig.ping_interval_sec = 10;       // Ping every 10 seconds
    wsConfig.pingpong_timeout_sec = 10;    // Expect pong within 10 seconds
    wsConfig.task_stack = 8192;            // Adequate stack for TLS + JSON
    wsConfig.user_agent = "ESP32-IoT-Device/1.0";

    // Format HTTP headers with device token (needs \r\n line endings)
    String reqHeaders = "Authorization: Bearer " + _deviceToken + "\r\n" +
                        "X-Device-Token: " + _deviceToken + "\r\n";
    wsConfig.headers = reqHeaders.c_str();
    
    // Initialize client
    _client = esp_websocket_client_init(&wsConfig);
    if (_client == nullptr) {
        Serial.println("[WS] Failed to initialize WebSocket client");
        return false;
    }

    // Register event handler
    esp_websocket_register_events(_client, WEBSOCKET_EVENT_ANY, 
                                   websocketEventHandler, this);

    // Start the WebSocket connection
    esp_err_t err = esp_websocket_client_start(_client);
    if (err != ESP_OK) {
        Serial.printf("[WS] Failed to start WebSocket: %d\n", err);
        esp_websocket_client_destroy(_client);
        _client = nullptr;
        return false;
    }

    Serial.println("[WS] Connection initiated");
    return true;
}

void WebSocketClient::disconnect() {
    if (_client != nullptr) {
        Serial.println("[WS] Disconnecting...");
        esp_websocket_client_stop(_client);
        esp_websocket_client_destroy(_client);
        _client = nullptr;
        _connected = false;
    }
}

bool WebSocketClient::sendJson(JsonDocument& doc) {
    if (_client == nullptr || !_connected) {
        Serial.println("[WS] Cannot send - not connected");
        return false;
    }

    // Serialize JSON to string
    char buffer[512];
    size_t len = serializeJson(doc, buffer);
    
    if (len == 0) {
        Serial.println("[WS] Failed to serialize JSON");
        return false;
    }

    // Send as text message
    int sent = esp_websocket_client_send_text(_client, buffer, len, portMAX_DELAY);
    
    if (sent < 0) {
        Serial.println("[WS] Failed to send message");
        return false;
    }

    Serial.printf("[WS] Sent: %s\n", buffer);
    return true;
}

bool WebSocketClient::isConnected() {
    return _connected && _client != nullptr && 
           esp_websocket_client_is_connected(_client);
}

void WebSocketClient::onMessage(std::function<void(JsonDocument&)> callback) {
    _messageCallback = callback;
}

void WebSocketClient::tick() {
    unsigned long currentTime = millis();

    // Check connection status periodically
    if (currentTime - _lastCheckTime >= _checkInterval) {
        _lastCheckTime = currentTime;
        
        // Check actual connection state
        if (_client != nullptr && !_connected) {
            if (esp_websocket_client_is_connected(_client)) {
                handleConnected();
            }
        }
    }

    // Send heartbeat if connected and interval passed
    if (_connected && currentTime - _lastHeartbeat >= _heartbeatInterval) {
        _lastHeartbeat = currentTime;
        sendHeartbeat();
    }
}

const char* WebSocketClient::getStatus() {
    if (_client == nullptr) return "not_initialized";
    if (!_connected) return "disconnected";
    if (esp_websocket_client_is_connected(_client)) return "connected";
    return "disconnected";
}

// Static event handler - routes to instance method
void WebSocketClient::websocketEventHandler(void* handler_args, esp_event_base_t base, 
                                           int32_t event_id, void* event_data) {
    if (_instance == nullptr) return;
    
    auto* client = static_cast<WebSocketClient*>(handler_args);
    
    switch (event_id) {
        case WEBSOCKET_EVENT_CONNECTED:
            client->handleConnected();
            break;
            
        case WEBSOCKET_EVENT_DISCONNECTED:
            client->handleDisconnected();
            break;
            
        case WEBSOCKET_EVENT_DATA:
            {
                auto* event = static_cast<esp_websocket_event_data_t*>(event_data);
                if (event->data_ptr != nullptr && event->data_len > 0) {
                    // Null-terminate for string parsing
                    char* data = new char[event->data_len + 1];
                    memcpy(data, event->data_ptr, event->data_len);
                    data[event->data_len] = '\0';
                    client->handleMessage(data, event->data_len);
                    delete[] data;
                }
            }
            break;
            
        case WEBSOCKET_EVENT_ERROR:
            client->handleError();
            break;
            
        default:
            break;
    }
}

void WebSocketClient::handleConnected() {
    _connected = true;
    _lastHeartbeat = millis();
    Serial.println("[WS] Connected to backend!");
    
    // Send initial state report after connection
    JsonDocument heartbeat;
    heartbeat["type"] = "heartbeat";
    heartbeat["deviceId"] = _deviceToken;
    heartbeat["uptime"] = millis();
    sendJson(heartbeat);
}

void WebSocketClient::handleDisconnected() {
    _connected = false;
    Serial.println("[WS] Disconnected from backend");
}

void WebSocketClient::handleMessage(char* data, size_t len) {
    Serial.printf("[WS] Received (%d bytes): %.*s\n", len, len, data);
    
    if (_messageCallback) {
        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, data, len);
        
        if (!error) {
            _messageCallback(doc);
        } else {
            Serial.printf("[WS] JSON parse error: %s\n", error.c_str());
        }
    }
}

void WebSocketClient::handleError() {
    Serial.println("[WS] WebSocket error occurred");
}

void WebSocketClient::sendHeartbeat() {
    JsonDocument heartbeat;
    heartbeat["type"] = "heartbeat";
    heartbeat["deviceId"] = _deviceToken;
    heartbeat["uptime"] = millis();
    
    if (sendJson(heartbeat)) {
        Serial.println("[WS] Heartbeat sent");
    } else {
        Serial.println("[WS] Heartbeat failed - may need reconnection");
    }
}
