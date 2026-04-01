---
status: resolving
trigger: "esp32-websocket-header-missing"
created: 2026-04-01T12:00:00Z
updated: 2026-04-01T12:00:00Z
---

## Current Focus
hypothesis: "Use native esp_websocket_client from arduino-esp32 core instead of non-existent WebSocketClient.h"
test: "Rewrite .ino to use esp_websocket_client API"
expecting: "Code compiles with arduino-esp32 v3.x"
next_action: "Verify fix compiles"

## Symptoms
expected: Compile for ESP32 using arduino-esp32 core
actual: fatal error: WebSocketClient.h: No such file or directory
errors: "#include <WebSocketClient.h> line 24 - library doesn't exist"
reproduction: "Compile the .ino file with arduino-esp32"
started: "File created today, first compilation attempt"

## Evidence
- timestamp: "2026-04-01T12:00:00Z"
  checked: "Original .ino file code"
  found: "Uses WebSocketClient class with methods like begin(), onEvent(), sendTXT(), loop(), enableSSL(), enableHeartbeat() - these are NOT from native esp_websocket_client"
  implication: "Code was written for a different library or incorrect API usage"
- timestamp: "2026-04-01T12:10:00Z"
  checked: "Updated .ino file"
  found: "Replaced with native esp_websocket_client API from arduino-esp32 core"
  implication: "Code now uses esp_websocket_client_init, esp_websocket_client_register_events, esp_websocket_client_send_text, etc."

## Resolution
root_cause: "Using non-existent WebSocketClient.h - need to use native esp_websocket_client from arduino-esp32 core"
fix: "Replaced #include <WebSocketClient.h> with #include <esp_websocket_client.h> and #include <esp_event.h>. Changed from class-based API to native ESP-IDF style: esp_websocket_client_handle_t, esp_websocket_client_init(), esp_websocket_client_register_events(), esp_websocket_client_send_text()"
verification: "The code now uses the native WebSocket client from arduino-esp32 v3.x. To verify, compile with PlatformIO using arduino-esp32 framework."
files_changed:
  - "firmware/esp32_iot_device/esp32_iot_device.ino"