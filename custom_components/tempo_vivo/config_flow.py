"""UI selection of existing entities."""
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.helpers import selector
from .const import DOMAIN, FIELDS

LABELS = {
    "weather": "weather", "indoor_temperature": "sensor", "indoor_humidity": "sensor",
    "outdoor_temperature": "sensor", "outdoor_humidity": "sensor", "wind": "sensor",
    "pressure": "sensor", "visibility": "sensor", "sunrise": "sensor", "sunset": "sensor",
    "heat_alert": "binary_sensor",
}

def schema(values):
    fields = {}
    for name in FIELDS:
        key = vol.Required(name, default=values[name]) if name == "weather" and values.get(name) else (vol.Required(name) if name == "weather" else vol.Optional(name, default=values[name]) if values.get(name) else vol.Optional(name))
        fields[key] = selector.EntitySelector(selector.EntitySelectorConfig(domain=LABELS[name]))
    return vol.Schema(fields)

class TempoVivoConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1
    async def async_step_user(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(title="Tempo Vivo", data=user_input)
        return self.async_show_form(step_id="user", data_schema=schema({}))
    @staticmethod
    def async_get_options_flow(config_entry):
        return TempoVivoOptionsFlow(config_entry)

class TempoVivoOptionsFlow(config_entries.OptionsFlow):
    def __init__(self, config_entry):
        self._entry = config_entry
    async def async_step_init(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)
        return self.async_show_form(step_id="init", data_schema=schema({**self._entry.data, **self._entry.options}))
