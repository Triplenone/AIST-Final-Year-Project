# Devices and Firmware

Documentation for the physical devices and embedded software powering the care experience.

## Components
- **Wearable Firmware**: RTOS-based firmware managing biometric sensors, low-power modes, and BLE communication.
- **Gateway Agent**: Containerized edge runtime responsible for local buffering, OTA updates, and resilience logic.
- **Facility Sensors**: Reference configurations for smart plugs, environmental monitors, and safety devices.

## Engineering Practices
- Secure boot and signed firmware updates.
- Continuous hardware-in-the-loop testing before releases.
- Telemetry sampling strategies to preserve battery life while ensuring clinical accuracy.
