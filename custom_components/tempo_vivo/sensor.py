"""Aggregate sensor with live attributes; no polling or external network calls."""
from homeassistant.components.sensor import SensorEntity
from homeassistant.core import callback
from homeassistant.helpers.event import async_track_state_change_event
from .const import FIELDS

async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([TempoVivoSensor(entry)])

class TempoVivoSensor(SensorEntity):
    _attr_name = "Tempo Vivo"
    _attr_icon = "mdi:weather-partly-cloudy"
    _attr_has_entity_name = True

    def __init__(self, entry):
        self._entry = entry
        self._attr_unique_id = entry.entry_id
        self._values = {**entry.data, **entry.options}
        self._attr_device_info = {"identifiers": {("tempo_vivo", entry.entry_id)}, "name": "Tempo Vivo", "manufacturer": "Comunidade"}

    @property
    def native_value(self):
        state = self.hass.states.get(self._values["weather"])
        return state.state if state and state.state not in ("unknown", "unavailable") else None

    @property
    def extra_state_attributes(self):
        result = {"source_entities": self._values}
        for field in FIELDS:
            entity_id = self._values.get(field)
            state = self.hass.states.get(entity_id) if entity_id else None
            if state and state.state not in ("unknown", "unavailable"):
                result[field] = state.state
                if field == "weather":
                    result["weather_attributes"] = {k: state.attributes.get(k) for k in ("temperature", "humidity", "pressure", "wind_speed", "wind_bearing", "visibility", "temperature_unit", "pressure_unit", "wind_speed_unit", "visibility_unit")}
                elif field != "heat_alert":
                    result[field + "_unit"] = state.attributes.get("unit_of_measurement")
        return result

    async def async_added_to_hass(self):
        @callback
        def update(_event):
            self.async_write_ha_state()
        self.async_on_remove(async_track_state_change_event(self.hass, set(self._values.values()), update))
