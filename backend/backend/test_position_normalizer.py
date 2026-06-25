from app.services.position_normalizer import normalize_position_payload


def test_legacy_location_current_becomes_position_current() -> None:
    position = normalize_position_payload(
        {
            "device_id": "ESP32_48CA43A42298",
            "location": {
                "current": {
                    "x": 7.6,
                    "y": 14.6,
                    "name": "Check-in",
                    "accuracy": 1.25,
                    "quality": "high",
                    "beacons_used": ["20:a7:16:60:f7:c4"],
                }
            },
        }
    )

    assert position is not None
    assert position["coordinate_space"] == "elderly_care_v1"
    assert position["map_asset"] == "ElderlyCare.png"
    assert position["current"]["x_m"] == 7.6
    assert position["current"]["y_m"] == 14.6
    assert position["current"]["x_ratio"] == 0.633333
    assert position["current"]["y_ratio"] == 0.9125
    assert position["current"]["x_px"] == 1112
    assert position["current"]["y_px"] == 2107
    assert position["current"]["zone_key"] == "activity_room"
    assert position["current"]["location_zone_id"] == 4
    assert position["current"]["name"] == "Activity Room"
    assert position["beacons"][0]["alias"] == "Activity Room Beacon 1"


def test_schema_v2_position_round_trips_with_normalized_pixels() -> None:
    position = normalize_position_payload(
        {
            "schema_version": 2,
            "scenario": "elderly_care",
            "device_id": "ESP32_000048CA43A42298",
            "position": {
                "current": {
                    "x_ratio": 0.5,
                    "y_ratio": 0.25,
                    "zone_key": "nurse_station",
                    "quality": "high",
                },
                "beacons": [
                    {
                        "mac": "20:a7:16:60:f7:ca",
                        "rssi": -62,
                        "distance_m": 1.2,
                        "confidence": 0.8,
                    }
                ],
            },
        }
    )

    assert position is not None
    assert position["current"]["x_m"] == 6.0
    assert position["current"]["y_m"] == 4.0
    assert position["current"]["x_px"] == 878
    assert position["current"]["y_px"] == 577
    assert position["current"]["zone_key"] == "nurse_station"
    assert position["current"]["location_zone_id"] == 3
    assert position["current"]["name"] == "Nurse Station"
    assert position["beacons"][0]["alias"] == "Nurse Station Beacon 1"
    assert position["beacons"][0]["zone_key"] == "nurse_station"


if __name__ == "__main__":
    test_legacy_location_current_becomes_position_current()
    test_schema_v2_position_round_trips_with_normalized_pixels()
    print("position normalizer fixtures passed")
