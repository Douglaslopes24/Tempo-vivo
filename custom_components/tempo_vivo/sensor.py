"""Live state aggregation, with no external requests or polling."""
from homeassistant.components.sensor import SensorEntity
from homeassistant.core import callback
from homeassistant.helpers.event import async_track_state_change_event

from .const import DOMAIN, FIELDS, WEATHER_ATTRIBUTES, configured_sources


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([TempoVivoSensor(entry)])


class TempoVivoSensor(SensorEntity):
    _attr_name = None
    _attr_icon = "mdi:weather-partly-cloudy"
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, entry):
        self._attr_unique_id = entry.entry_id
        self._values = configured_sources(entry)
        self._attr_device_info = {
            "identifiers": {(DOMAIN, entry.entry_id)}, "name": "Tempo Vivo",
            "manufacturer": "Tempo Vivo", "model": "Sensores existentes",
        }

    @property
    def available(self):
        state = self.hass.states.get(self._values["weather"])
        return state is not None and state.state not in ("unknown", "unavailable")

    @property
    def native_value(self):
        state = self.hass.states.get(self._values["weather"])
        return state.state if self.available else None

    @property
    def extra_state_attributes(self):
        result = {"source_entities": self._values}
        for field in FIELDS:
            entity_id = self._values.get(field)
            state = self.hass.states.get(entity_id) if entity_id else None
            if state is None or state.state in ("unknown", "unavailable"):
                continue
            result[field] = state.state
            if field == "weather":
                result["weather_attributes"] = {
                    key: state.attributes[key] for key in WEATHER_ATTRIBUTES if key in state.attributes
                }
            elif field not in ("heat_alert", "rain_sensor", "storm_alert"):
                result[field + "_unit"] = state.attributes.get("unit_of_measurement")
        return result

    async def async_added_to_hass(self):
        @callback
        def update(_event):
            self.async_write_ha_state()

        self.async_on_remove(async_track_state_change_event(self.hass, set(self._values.values()), update))
