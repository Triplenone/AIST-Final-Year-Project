# Firmware Skeleton / ���鰩�[

## English
This directory is a placeholder for the ESP32-based wearable firmware. It already matches the PlatformIO layout (src/include/test) and pulls in the libraries we expect to use (MPU6050, MAX30102, TinyGPS++, PubSubClient, ArduinoJson). Add your implementation to `src/` and keep secrets (Wi-Fi, MQTT credentials, TLS certs) inside `src/util/config.h` or a separate config file that is git-ignored.

### TODO checklist
1. Implement Wi-Fi bootstrap with exponential backoff.
2. BLE beacon scanner that emits `{beacon_id, rssi}` at a configurable duty-cycle.
3. GNSS reader (ATGM336H) via TinyGPS++.
4. MQTT/TLS publisher + SOS / OTA subscribers.
5. OTA client that validates SHA256 + signature before flashing.

## �c�餤��
����Ƨ��� ESP32 ���骺�w�d�Ŷ��A�w�]�w�n PlatformIO �һݪ��ɮ׵��c�P�`�Ψ禡�w�C���ӽЧ��@�{����b `src/`�A�ðȥ��N Wi-Fi / MQTT / TLS ���ҵ��ӷP��T��b `.gitignore` ���]�w�ɤ��C

### �ݿ�ƶ�
1. �إ� Wi-Fi �s�u�y�{�]�t����/backoff�^�C
2. ���g BLE Beacon ���y���A�w����X `{beacon_id, rssi}`�C
3. �ϥ� TinyGPS++ Ū�� ATGM336H GNSS �ҲաC
4. �z�L MQTT/TLS �W���ơA�ú�ť SOS/OTA ���O�C
5. ��@ OTA ���ҡ]SHA256 + ñ���^��A�g�J�ְ{�O����C
