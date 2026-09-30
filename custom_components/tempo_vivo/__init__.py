"""Tempo Vivo: existing weather/sensors and an automatically loaded dashboard card."""
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .const import DOMAIN, VERSION

PLATFORMS = [Platform.SENSOR]
CARD_URL = "/tempo_vivo/tempo-vivo-card.js"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Serve the packaged card and load it without editing Lovelace resources."""
    await hass.http.async_register_static_paths([
        StaticPathConfig(CARD_URL, str(Path(__file__).parent / "tempo-vivo-card.js"), False)
    ])
    add_extra_js_url(hass, f"{CARD_URL}?v={VERSION}")
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_update_entry))
    return True


async def _update_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
