# Smartwatch Firmware Variants

This directory stores two independent Arduino IDE smartwatch firmware variants imported from local snapshots.

## Variants

- `old/` - imported from `SmartWatch_Project_Lin_20260320130249` (2026-03-20 snapshot)
- `new/` - imported from `SmartWatch_Project_New` (ESP32-S3, "S3A3" hardware config, 2026-04 snapshot)

## Observed differences

- Both variants use Arduino IDE project layout rather than PlatformIO.
- The `new/` variant includes additional files such as `AudioManager.cpp`, `FT6146.h`, `PageManager.h`, and `fix_compile_errors.h`.
- The `new/` variant carries an S3A3 hardware-oriented pin configuration in `pin_config.h`.
- Both variants embed a large `canon.h` audio asset and a `REG/` directory with hardware register headers.

## Build

Build these variants with Arduino IDE and the ESP32 board package. They are intentionally kept separate from the top-level `firmware/platformio.ini` scaffold, which remains an independent track.

## Sanitization Notice

`Config.h` in both variants has Wi-Fi SSID, Wi-Fi password, and server URL replaced with placeholders before import.

## Not Verified

This import was not compile-tested, flash-tested, hardware-tested, or syntax-checked with Arduino tooling.

## Excluded From Import

The `new/` import excludes `build/`, `.vscode/`, and compiled artifacts such as `*.bin`, `*.elf`, `*.map`, `*.hex`, `*.o`, and `*.a`.
