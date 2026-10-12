"""Install, serve, migrate and reload Ceuvia in an isolated real Home Assistant.

Run with Python 3.12 and homeassistant==2024.8.0 plus its pinned frontend.
Only localhost and generated example states are used. No user instance or
account is contacted. The temporary configuration is deleted after the run.
"""
import asyncio
import json
import logging
from pathlib import Path
import shutil
import socket
import tempfile
from unittest.mock import AsyncMock, patch

import aiohttp
from homeassistant import bootstrap, loader
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry

ROOT = Path(__file__).resolve().parents[1]
DOMAIN = "tempo_vivo"
VERSION = json.loads((ROOT / "custom_components/tempo_vivo/manifest.json").read_text())["version"]
RESOURCE = f"/ceuvia/ceuvia-weather-card.js?v={VERSION}"
checks = []


def check(name, value):
    checks.append({"name": name, "ok": bool(value)})
    if not value:
        raise AssertionError(name)


async def main():
    logging.basicConfig(level=logging.WARNING)
    with tempfile.TemporaryDirectory(prefix="ceuvia-ha-") as folder:
        config_dir = Path(folder)
        shutil.copytree(ROOT / "custom_components/tempo_vivo", config_dir / "custom_components/tempo_vivo",
                        ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            port = probe.getsockname()[1]
        hass = HomeAssistant(str(config_dir))
        loader.async_setup(hass)
        try:
            config = {"homeassistant": {"name": "Ceuvia test", "latitude": -23.55, "longitude": -46.63,
                                        "elevation": 760, "unit_system": "metric", "time_zone": "America/Sao_Paulo"},
                      "http": {"server_host": "127.0.0.1", "server_port": port}, "frontend": {}}
            # The test host need not enumerate physical network interfaces.
            # Only its generated localhost HTTP service is exercised.
            with patch("homeassistant.components.http.async_get_source_ip", AsyncMock(return_value="127.0.0.1")), patch("homeassistant.components.network.network.async_load_adapters", AsyncMock(return_value=[])):
                result = await bootstrap.async_from_config_dict(config, hass)
            check("Real Home Assistant frontend starts", result is not None and "frontend" in hass.config.components)
            hass.states.async_set("weather.casa", "sunny", {"temperature": 27, "temperature_unit": "°C", "humidity": 61})
            hass.states.async_set("sensor.casa", "24.6", {"device_class": "temperature", "unit_of_measurement": "°C"})
            hass.states.async_set("binary_sensor.alerta", "off")

            resources = hass.data["lovelace"]["resources"]
            await resources.async_load()
            resources.loaded = True
            await resources.async_create_item({"url": "/local/other-card.js", "res_type": "module"})
            await resources.async_create_item({"url": "/tempo_vivo/tempo-vivo-card.js?v=2.1.0", "res_type": "module"})

            legacy = ConfigEntry(version=1, minor_version=1, domain=DOMAIN, title="Tempo Vivo", source="user", unique_id=None,
                                 data={"weather": "weather.casa", "indoor_temperature": "sensor.casa", "heat_alert": "binary_sensor.alerta"}, options={})
            registry = entity_registry.async_get(hass)
            old_entity = registry.async_get_or_create("sensor", DOMAIN, legacy.entry_id, suggested_object_id="tempo_vivo")
            await hass.config_entries.async_add(legacy)
            await hass.async_block_till_done()
            check("Legacy integration loads with the Ceuvia name", legacy.title == "Ceuvia Weather Card")
            state = hass.states.get(old_entity.entity_id)
            check("Existing sensor entity ID is preserved", state is not None and state.state == "sunny")
            check("Selected indoor sensor is aggregated", state.attributes.get("indoor_temperature") == "24.6")
            items = resources.async_items()
            check("Canonical module is registered once", sum(item["url"] == RESOURCE for item in items) == 1)
            check("Legacy resource migrates to canonical URL", not any(item["url"].startswith("/tempo_vivo/") for item in items))
            check("Unrelated dashboard resource remains", any(item["url"] == "/local/other-card.js" for item in items))

            await hass.async_start()
            await hass.async_block_till_done()
            async with aiohttp.ClientSession() as client:
                for endpoint in [RESOURCE, "/tempo_vivo/tempo-vivo-card.js?v=" + VERSION]:
                    async with client.get(f"http://127.0.0.1:{port}{endpoint}") as response:
                        code = await response.text()
                        check("HTTP serves " + endpoint, response.status == 200 and "customElements.define('ceuvia-weather-card'" in code)
                        check("Module has a JavaScript content type", "javascript" in response.headers.get("Content-Type", ""))

            hass.states.async_set("weather.casa", "rainy", {"temperature": 25, "temperature_unit": "°C"})
            await hass.async_block_till_done()
            check("Weather state updates without polling", hass.states.get(old_entity.entity_id).state == "rainy")
            options = await hass.config_entries.options.async_init(legacy.entry_id)
            await hass.config_entries.options.async_configure(options["flow_id"], user_input={"weather": "weather.casa", "indoor_temperature": "sensor.casa"})
            await hass.async_block_till_done()
            check("Options clear removed alert sensors", "heat_alert" not in hass.states.get(old_entity.entity_id).attributes["source_entities"])
            check("Reload preserves the entity ID", registry.async_get_entity_id("sensor", DOMAIN, legacy.entry_id) == old_entity.entity_id)
            check("Reload keeps one module resource", sum(item["url"] == RESOURCE for item in resources.async_items()) == 1)

            flow = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
            created = await hass.config_entries.flow.async_configure(flow["flow_id"], user_input={"weather": "weather.casa"})
            await hass.async_block_till_done()
            check("New install completes its config flow", created["type"] == "create_entry" and created["title"] == "Ceuvia Weather Card")
            check("Multiple entries do not duplicate resources", sum(item["url"] == RESOURCE for item in resources.async_items()) == 1)
            hass.states.async_set("weather.casa", "unavailable")
            await hass.async_block_till_done()
            check("Unavailable weather marks aggregate condition unknown", hass.states.get(old_entity.entity_id).state == "unknown")
            check("Unavailable aggregate retains independent indoor data", hass.states.get(old_entity.entity_id).attributes.get("indoor_temperature") == "24.6")
        finally:
            await hass.async_stop()
        saved = json.loads((config_dir / ".storage/lovelace_resources").read_text())["data"]["items"]
        check("Resource registration is persisted to real storage", sum(item["url"] == RESOURCE for item in saved) == 1)
    report = {"home_assistant": "2024.8.0", "version": VERSION, "checks": checks, "passed": all(item["ok"] for item in checks)}
    (ROOT / "docs/ha-smoke-results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
