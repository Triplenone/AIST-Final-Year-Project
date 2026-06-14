import unittest

from app.services.sensor_vitals_extract import extract_hr_spo2_from_sensors


class SensorVitalsExtractTests(unittest.TestCase):
    def test_ignores_invalid_nested_heart_rate_but_keeps_valid_spo2(self):
        sensors = {
            "heart_rate": {"bpm": 0, "valid": False},
            "spo2": {"percentage": 96, "valid": True},
        }

        self.assertEqual(extract_hr_spo2_from_sensors(sensors), (None, 96.0))

    def test_accepts_valid_nested_values(self):
        sensors = {
            "heart_rate": {"bpm": 83, "valid": True},
            "spo2": {"percentage": 98, "valid": True},
        }

        self.assertEqual(extract_hr_spo2_from_sensors(sensors), (83, 98.0))

    def test_rejects_out_of_range_values(self):
        sensors = {
            "heart_rate": {"bpm": 0},
            "spo2": {"percentage": 0},
        }

        self.assertEqual(extract_hr_spo2_from_sensors(sensors), (None, None))


if __name__ == "__main__":
    unittest.main()
