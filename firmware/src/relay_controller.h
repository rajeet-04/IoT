/**
 * RelayController - ESP32 Relay Control Module
 * 
 * Controls SRD-05VDC-SL-C relay with safe boot state and state reporting.
 * Includes flyback diode protection wiring diagram.
 * 
 * Default Pin: GPIO 2 (D2)
 * 
 * Wiring Diagram (CRITICAL - Follow exactly for safety):
 * 
 *     +5V ------+------ Relay Module VCC
 *                |
 *               [100µF] (optional, stabilizes power)
 *                |
 *     GND ------+------ Relay Module GND
 *                |
 *    ESP32 -----+------ Relay Module Signal (GPIO 2)
 *     GND ------+------ Relay Module GND (common ground)
 * 
 * For transistror-driven relay (recommended for ESP32):
 * 
 *     ESP32 GPIO 2 ----[1kΩ resistor]----+
 *                                         |
 *                              +----[2N2222 NPN]----+
 *                              |         |          |
 *                            Collector  Base      Emitter
 *                                         |          |
 *     +5V ------------------+---[1N4007]--+------- GND
 *                           |             Flyback
 *                      Relay Coil        Diode
 *                           |
 *                          GND
 * 
 * Flyback Diode Connection:
 *   - Diode cathode (banded end) → +5V side of relay coil
 *   - Diode anode (plain end) → Transistor collector
 *   - This clamps voltage spikes when relay de-energizes
 * 
 * Safety Notes:
 *   - ALWAYS use flyback diode with inductive loads (relays)
 *   - Use separate 5V supply capable of 1A+ for relay power
 *   - ESP32 cannot power relay directly - use transistor driver
 *   - Keep high-voltage wiring separate from low-voltage logic
 */

#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>

class RelayController {
public:
    /**
     * Constructor
     * @param gpioPin GPIO pin connected to relay signal input
     */
    RelayController(int gpioPin = 2);

    /**
     * Initialize the relay controller
     * Sets GPIO to OUTPUT and ensures safe OFF state
     * Call this BEFORE any network operations
     */
    void begin();

    /**
     * Turn relay ON (energize)
     */
    void setOn();

    /**
     * Turn relay OFF (de-energize)
     */
    void setOff();

    /**
     * Set relay state
     * @param on true = ON, false = OFF
     */
    void setState(bool on);

    /**
     * Get current relay state
     * @return true = ON, false = OFF
     */
    bool getState() const;

    /**
     * Get state as JSON document for reporting to backend
     * @return JSON document with type, relay state, deviceId, and uptime
     */
    JsonDocument getStateJson();

    /**
     * Set the device token for state reporting
     * @param token Device authentication token
     */
    void setDeviceToken(const char* token);

    /**
     * Get the configured GPIO pin
     * @return GPIO pin number
     */
    int getPin() const { return _gpioPin; }

private:
    int _gpioPin;
    bool _state;          // Current relay state (true = ON)
    String _deviceToken;  // Device token for state reporting
};

/*
 * =============================================================================
 * WIRING DIAGRAM (Text)
 * =============================================================================
 * 
 *                    ┌─────────────────┐
 *                    │   ESP32 DevKit  │
 *                    │                 │
 *     GPIO 2 ───────┤ (D2)            │
 *                    │                 │
 *     3.3V ─────────┤ (3V3)           │
 *                    │                 │
 *     GND ──────────┤ (GND)           │
 *                    └────────┬────────┘
 *                             │
 *                    ┌────────┴────────┐
 *                    │   2N2222 NPN     │
 *                    │   Transistor     │
 *                    │                 │
 *                    │  C (Collector)  │
 *                    │  B (Base)  ←───┼──┐
 *                    │  E (Emitter) ───┘  │
 *                    └─────────────────┘  │
 *                             │          │
 *                    ┌────────┴────────┐│
 *                    │  1N4007 Flyback  │
 *                    │     Diode         │
 *                    │                   │
 *      Cathode ─────┤─ (banded end)    │
 *      Anode   ─────┤─ (plain end)     │
 *                    └─────────────────┘│
 *                             │          │
 *                    ┌────────┴─────────┘
 *                    │
 *              ┌─────┴─────┐
 *              │  RELAY    │
 *              │  MODULE   │
 *              │           │
 *              │  VCC ─────┼── +5V
 *              │  GND ─────┼── GND
 *    GPIO 2 ──┤  IN ──────┼── Signal (via 1kΩ resistor)
 *              └───────────┘
 *                    │
 *              [SRD-05VDC-SL-C Relay Coil]
 *                    │
 *                   GND
 * 
 * =============================================================================
 * COMPONENT VALUES
 * =============================================================================
 * 
 * R1: 1kΩ resistor (1/4W) - base current limiting
 * D1: 1N4007 flyback diode - voltage spike protection
 * Q1: 2N2222 NPN transistor - current amplification
 * C1: 100µF 10V capacitor (optional) - power stabilization
 * 
 * =============================================================================
 */
