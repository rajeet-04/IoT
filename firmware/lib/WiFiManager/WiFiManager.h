/**
 * WiFiManager - ESP32 WiFi Connection Manager with Auto-Reconnect
 *
 * Provides reliable WiFi connection with exponential backoff reconnection.
 * Credentials are read from build flags (platformio.ini), NOT hardcoded.
 *
 * Wiring:
 *   - No special wiring required for WiFi (uses built-in ESP32 WiFi)
 *   - Ensure ESP32 has clear line of sight to WiFi router
 *
 * Usage:
 *   #include "WiFiManager.h"
 *
 *   const char* ssid = WIFI_SSID;    // From build flags
 *   const char* password = WIFI_PASSWORD;
 *
 *   WiFiManager wifiManager(ssid, password);
 *
 *   void setup() {
 *     Serial.begin(115200);
 *     if (wifiManager.connect()) {
 *       Serial.println("WiFi connected!");
 *     }
 *     wifiManager.beginAutoReconnect();
 *   }
 *
 *   void loop() {
 *     wifiManager.tick();
 *     delay(1000);
 *   }
 */

#pragma once

#include <WiFi.h>
#include <functional>

class WiFiManager {
public:
  /**
   * Constructor
   * @param ssid WiFi network name (SSID)
   * @param password WiFi network password
   */
  WiFiManager(const char *ssid, const char *password);

  /**
   * Connect to WiFi network
   * @return true if connected successfully
   */
  bool connect();

  /**
   * Check if currently connected to WiFi
   * @return true if WiFi.status() == WL_CONNECTED
   */
  bool isConnected();

  /**
   * Register callback for WiFi disconnection events
   * @param callback Function to call when WiFi disconnects
   */
  void onDisconnect(std::function<void()> callback);

  /**
   * Start automatic reconnection on WiFi disconnection
   * Registers event handler for ARDUINO_EVENT_WIFI_STA_DISCONNECTED
   */
  void beginAutoReconnect();

  /**
   * Call this periodically in loop() to handle reconnection polling
   * Checks WiFi status every 5 seconds and triggers reconnection if needed
   */
  void tick();

  /**
   * Get the current signal strength (RSSI)
   * @return RSSI value in dBm, or -100 if not connected
   */
  int getSignalStrength();

  /**
   * Get the device's IP address
   * @return IPAddress of the ESP32, or INADDR_NONE if not connected
   */
  IPAddress getLocalIP();

private:
  const char *_ssid;
  const char *_password;
  std::function<void()> _disconnectCallback;
  unsigned long _lastReconnectAttempt;
  unsigned long _reconnectDelay; // Current delay in ms
  unsigned long _checkInterval;  // How often to check connection
  unsigned long _lastCheckTime;
  bool _isConnected;
  bool _autoReconnectEnabled;
  static const unsigned long INITIAL_RECONNECT_DELAY = 1000; // 1 second
  static const unsigned long MAX_RECONNECT_DELAY = 30000;     // 30 seconds
  static const unsigned long DEFAULT_CHECK_INTERVAL = 5000;  // 5 seconds

  void handleReconnect();
  void setReconnectDelay(unsigned long delay);
};

/**
 * IMPORTANT: WiFi Credentials Configuration
 *
 * Credentials MUST be provided via build flags or environment variables.
 * NEVER hardcode actual WiFi passwords in source code.
 *
 * Option 1: Set in platformio.ini (for local development):
 *   build_flags =
 *       -DWIFI_SSID='"YourNetworkName"'
 *       -DWIFI_PASSWORD='"YourPassword"'
 *
 * Option 2: Set environment variables:
 *   export WIFI_SSID="YourNetworkName"
 *   export WIFI_PASSWORD="YourPassword"
 *   pio run -e esp32dev
 *
 * Option 3: Use a credentials.h file (gitignored):
 *   Create lib/config/credentials.h with:
 *   #pragma once
 *   #define WIFI_SSID "YourNetworkName"
 *   #define WIFI_PASSWORD "YourPassword"
 *   Then add lib/config to build_flags
 */
