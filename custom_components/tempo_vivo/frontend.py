"""Serve the bundled card and let the dashboard load it as a resource."""
import asyncio
import logging
from pathlib import Path

from homeassistant.components.http import StaticPathConfig
from homeassistant.components.lovelace.const import DOMAIN as LOVELACE_DOMAIN
from homeassistant.core import HomeAssistant

from .const import CARD_RESOURCE_URL, CARD_URL, DOMAIN
from .resources import async_register_resource

_LOGGER = logging.getLogger(__name__)


async def async_setup_frontend(hass: HomeAssistant) -> None:
    """Register once across entries; retry resource registration on reload."""
    runtime = hass.data.setdefault(DOMAIN, {})
    lock = runtime.setdefault("frontend_lock", asyncio.Lock())
    async with lock:
        if not runtime.get("static_registered"):
            await hass.http.async_register_static_paths([
                StaticPathConfig(
                    CARD_URL,
                    str(Path(__file__).parent / "tempo-vivo-card.js"),
                    False,
                )
            ])
            runtime["static_registered"] = True

        try:
            registered = await async_register_resource(
                hass.data.get(LOVELACE_DOMAIN), CARD_RESOURCE_URL
            )
        except Exception:  # Resource failures must not disable the sensor.
            _LOGGER.exception(
                "Falha ao registrar o card Tempo Vivo. Adicione %s como "
                "Modulo JavaScript em Configuracoes > Paineis > Recursos",
                CARD_RESOURCE_URL,
            )
            return

        if not registered:
            _LOGGER.warning(
                "Recursos Lovelace indisponiveis ou gerenciados por YAML. "
                "Adicione %s com type: module aos recursos do painel",
                CARD_RESOURCE_URL,
            )
