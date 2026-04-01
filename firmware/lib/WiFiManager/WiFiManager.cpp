/**
 * WiFiManager - Implementation
 * 
 * Provides reliable WiFi connection management with:
 * - Connection timeout handling
 * - Automatic reconnection on dropout
 * - Exponential backoff for reconnection attempts
 * - Event-based disconnection detection
 */

#include "WiFiManager.h"
#include <Arduino.h>

WiFiManager::WiFiManager(const char* ssid, const char* password)
    : _ssid(ssid)
    , _password(password)
    , _lastReconnectAttempt(0)
    , _reconnectDelay(INITIAL_RECONNECT_DELAY)
    , _checkInterval(DEFAULT_CHECK_INTERVAL)
    , _lastCheckTime(0)
    , _isConnected(false)
    , _autoReconnectEnabled(false)
{
}

bool WiFiManager::connect() {
    Serial.printf("[WiFi] Connecting to SSID: %s\n", _ssid);
    
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(false);  // We handle reconnection manually for better control
    WiFi.begin(_ssid, _password);

    // Wait for connection with timeout (15 seconds)
    unsigned long startTime = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startTime < 15000) {
        delay(100);
        Serial.print(".");
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        _isConnected = true;
        _reconnectDelay = INITIAL_RECONNECT_DELAY;  // Reset backoff on successful connect
        Serial.printf("[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("[WiFi] Signal strength (RSSI): %d dBm\n", WiFi.RSSI());
        return true;
    } else {
        _isConnected = false;
        Serial.printf("[WiFi] Connection failed! Status: %d\n", WiFi.status());
        return false;
    }
}

bool WiFiManager::isConnected() {
    return WiFi.status() == WL_CONNECTED;
}

void WiFiManager::onDisconnect(std::function<void()> callback) {
    _disconnectCallback = callback;
}

void WiFiManager::beginAutoReconnect() {
    Serial.println("[WiFi] Enabling auto-reconnect on WiFi disconnection");
    
    WiFi.onEvent([this](WiFiEvent_t event, WiFiEventInfo_t info) {
        if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
            _isConnected = false;
            Serial.println("[WiFi] Disconnected from network");
            
            // Call disconnect callback if registered
            if (_disconnectCallback) {
                _disconnectCallback();
            }
            
            // Trigger reconnection
            handleReconnect();
        }
    }, ARDUINO_EVENT_WIFI_STA_DISCONNECTED);
    
    _autoReconnectEnabled = true;
}

void WiFiManager::tick() {
    unsigned long currentTime = millis();
    
    // Check connection status periodically
    if (currentTime - _lastCheckTime >= _checkInterval) {
        _lastCheckTime = currentTime;
        
        bool currentStatus = isConnected();
        
        if (currentStatus && !_isConnected) {
            // Connection restored
            Serial.printf("[WiFi] Connection restored! IP: %s\n", WiFi.localIP().toString().c_str());
            _isConnected = true;
            _reconnectDelay = INITIAL_RECONNECT_DELAY;  // Reset backoff
        } else if (!currentStatus && _isConnected) {
            // Connection lost
            Serial.println("[WiFi] Connection lost detected");
            _isConnected = false;
            handleReconnect();
        }
    }
    
    // Handle reconnection if enabled and not connected
    if (_autoReconnectEnabled && !_isConnected) {
        if (currentTime - _lastReconnectAttempt >= _reconnectDelay) {
            _lastReconnectAttempt = currentTime;
            
            Serial.printf("[WiFi] Attempting reconnection (delay: %lu ms)...\n", _reconnectDelay);
            WiFi.disconnect();
            WiFi.begin(_ssid, _password);
        }
    }
}

void WiFiManager::handleReconnect() {
    if (!_autoReconnectEnabled) return;
    
    Serial.printf("[WiFi] Scheduling reconnection with delay: %lu ms\n", _reconnectDelay);
    
    // Double the delay for exponential backoff (capped at max)
    _reconnectDelay = min(_reconnectDelay * 2, MAX_RECONNECT_DELAY);
    
    Serial.printf("[WiFi] Next retry delay will be: %lu ms\n", _reconnectDelay);
}

void WiFiManager::setReconnectDelay(unsigned long delay) {
    _reconnectDelay = constrain(delay, INITIAL_RECONNECT_DELAY, MAX_RECONNECT_DELAY);
}

int WiFiManager::getSignalStrength() {
    if (isConnected()) {
        return WiFi.RSSI();
    }
    return -100;  // Invalid value when not connected
}

IPAddress WiFiManager::getLocalIP() {
    if (isConnected()) {
        return WiFi.localIP();
    }
    return INADDR_NONE;
}
