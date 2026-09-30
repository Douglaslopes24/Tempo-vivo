"""Regression: clearing optional sensors must not restore stale entry.data values."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest

spec = importlib.util.spec_from_file_location("tempo_vivo_const", Path(__file__).parents[1] / "custom_components/tempo_vivo/const.py")
const = importlib.util.module_from_spec(spec)
spec.loader.exec_module(const)


class SourceConfigurationTest(unittest.TestCase):
    def test_initial_data_is_used(self):
        entry = SimpleNamespace(data={"weather": "weather.casa", "indoor_temperature": "sensor.casa"}, options={})
        self.assertEqual(const.configured_sources(entry), entry.data)

    def test_removed_optional_sensor_is_not_restored(self):
        entry = SimpleNamespace(data={"weather": "weather.old", "heat_alert": "binary_sensor.old"}, options={"weather": "weather.new"})
        self.assertEqual(const.configured_sources(entry), {"weather": "weather.new"})

    def test_only_nonempty_entity_fields_are_returned(self):
        entry = SimpleNamespace(data={"weather": "weather.casa", "indoor_humidity": "", "title": "Minha casa"}, options={})
        self.assertEqual(const.configured_sources(entry), {"weather": "weather.casa"})


if __name__ == "__main__":
    unittest.main()
