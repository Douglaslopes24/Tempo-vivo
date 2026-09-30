"""Configure Tempo Vivo through existing entities."""
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import DOMAIN, FIELDS, configured_sources


DOMAINS = {key: "sensor" for key in FIELDS}
DOMAINS.update(weather="weather", heat_alert="binary_sensor", rain_sensor="binary_sensor", storm_alert="binary_sensor")


def schema(values):
    fields = {}
    for name in FIELDS:
        marker = vol.Required(name) if name == "weather" else vol.Optional(name)
        if values.get(name):
            marker = (vol.Required if name == "weather" else vol.Optional)(
                name, description={"suggested_value": values[name]}
            )
        fields[marker] = selector.EntitySelector(selector.EntitySelectorConfig(domain=DOMAINS[name]))
    return vol.Schema(fields)


class TempoVivoConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(title="Tempo Vivo", data={k: v for k, v in user_input.items() if v})
        return self.async_show_form(step_id="user", data_schema=schema({}))

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return TempoVivoOptionsFlow(config_entry)


class TempoVivoOptionsFlow(config_entries.OptionsFlow):
    def __init__(self, config_entry):
        self._entry = config_entry

    async def async_step_init(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(title="", data={k: v for k, v in user_input.items() if v})
        return self.async_show_form(step_id="init", data_schema=schema(configured_sources(self._entry)))
