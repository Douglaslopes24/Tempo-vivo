"""Regression coverage for startup, upgrades and missing Lovelace resources."""
import asyncio
from copy import deepcopy
from dataclasses import dataclass
import importlib.util
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import patch

COMPONENT = Path(__file__).parents[1] / "custom_components/tempo_vivo"
URL = "/tempo_vivo/tempo-vivo-card.js?v=2.0.1"
OTHER = {"id": "other", "url": "/hacsfiles/bubble-card/bubble-card.js", "type": "module"}

spec = importlib.util.spec_from_file_location("tv_resources", COMPONENT / "resources.py")
resources_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(resources_module)


class StoredResources:
    """Persisted state is initially separate from the unloaded collection.

    The legacy API allows creation without loading first. Simulate that here:
    saving an unloaded collection would replace every unrelated stored item.
    Updates also reproduce newer Home Assistant's implicit load behavior.
    """

    def __init__(self, stored=(), loaded=False):
        self.stored = deepcopy(list(stored))
        self.loaded = loaded
        self.items = deepcopy(self.stored) if loaded else []
        self.loads = 0
        self.writes = 0

    async def async_load(self):
        self.loads += 1
        await asyncio.sleep(0)
        self.items = deepcopy(self.stored)

    def async_items(self):
        return self.items

    def save(self):
        self.writes += 1
        self.stored = deepcopy(self.items)

    async def async_create_item(self, data):
        self.items.append({"id": f"created-{self.writes}", "url": data["url"], "type": data["res_type"]})
        self.save()

    async def async_update_item(self, item_id, data):
        if not self.loaded:
            await self.async_load()
            self.loaded = True
        for item in self.items:
            if item["id"] == item_id:
                item.update(url=data["url"], type=data["res_type"])
                self.save()
                return
        raise KeyError(item_id)

    async def async_delete_item(self, item_id):
        self.items = [item for item in self.items if item["id"] != item_id]
        self.save()


class ResourceRegistrationTest(unittest.IsolatedAsyncioTestCase):
    async def test_first_start_loads_before_writing_and_preserves_other_cards(self):
        collection = StoredResources([OTHER])
        self.assertTrue(await resources_module.async_register_resource(SimpleNamespace(resources=collection), URL))
        self.assertEqual(collection.stored[0], OTHER)
        self.assertEqual(collection.stored[1]["url"], URL)
        self.assertEqual(collection.loads, 1)
        self.assertTrue(collection.loaded)

    async def test_legacy_home_assistant_dictionary_is_supported(self):
        collection = StoredResources([OTHER])
        await resources_module.async_register_resource({"resources": collection}, URL)
        self.assertEqual(len(collection.stored), 2)

    async def test_upgrade_updates_existing_id_instead_of_creating_duplicate(self):
        previous = {"id": "tv", "url": "/tempo_vivo/tempo-vivo-card.js?v=1.0.1", "type": "module"}
        collection = StoredResources([OTHER, previous])
        await resources_module.async_register_resource({"resources": collection}, URL)
        self.assertEqual(collection.stored, [OTHER, {"id": "tv", "url": URL, "type": "module"}])
        self.assertEqual(collection.loads, 1)

    async def test_reload_does_not_write_an_already_current_resource(self):
        current = {"id": "tv", "url": URL, "type": "module"}
        collection = StoredResources([OTHER, current], loaded=True)
        await resources_module.async_register_resource({"resources": collection}, URL)
        await resources_module.async_register_resource({"resources": collection}, URL)
        self.assertEqual(collection.writes, 0)
        self.assertEqual(collection.loads, 0)

    async def test_wrong_resource_type_is_corrected_even_when_url_matches(self):
        collection = StoredResources([{"id": "tv", "url": URL, "type": "js"}])
        await resources_module.async_register_resource({"resources": collection}, URL)
        self.assertEqual(collection.stored[0]["type"], "module")

    async def test_only_duplicates_of_this_integration_are_removed(self):
        duplicate = {"id": "duplicate", "url": "/tempo_vivo/tempo-vivo-card.js", "type": "module"}
        external = {"id": "external", "url": "https://example.test/tempo_vivo/tempo-vivo-card.js", "type": "module"}
        collection = StoredResources([OTHER, {"id": "tv", "url": URL, "type": "module"}, duplicate, external])
        await resources_module.async_register_resource({"resources": collection}, URL)
        self.assertEqual([item["id"] for item in collection.stored], ["other", "tv", "external"])

    async def test_resource_deleted_by_user_is_recreated_on_reload(self):
        collection = StoredResources([OTHER], loaded=True)
        await resources_module.async_register_resource({"resources": collection}, URL)
        self.assertEqual(collection.stored[1]["url"], URL)

    async def test_yaml_resources_are_left_unchanged(self):
        items = [OTHER]
        collection = SimpleNamespace(loaded=True, async_items=lambda: items)
        self.assertFalse(await resources_module.async_register_resource({"resources": collection}, URL))
        self.assertEqual(items, [OTHER])

    async def test_missing_lovelace_can_use_the_documented_manual_fallback(self):
        self.assertFalse(await resources_module.async_register_resource(None, URL))
        self.assertFalse(await resources_module.async_register_resource({}, URL))


@dataclass
class StaticPath:
    url_path: str
    path: str
    cache_headers: bool


def load_frontend_with_ha_interfaces():
    """Use the production setup with only Home Assistant interfaces replaced."""
    names = ("homeassistant", "homeassistant.components", "homeassistant.components.http",
             "homeassistant.components.lovelace", "homeassistant.components.lovelace.const", "homeassistant.core")
    interfaces = {name: ModuleType(name) for name in names}
    interfaces["homeassistant.components.http"].StaticPathConfig = StaticPath
    interfaces["homeassistant.components.lovelace.const"].DOMAIN = "lovelace"
    interfaces["homeassistant.core"].HomeAssistant = SimpleNamespace
    package = ModuleType("tv_test_component")
    package.__path__ = [str(COMPONENT)]
    interfaces[package.__name__] = package
    frontend_spec = importlib.util.spec_from_file_location("tv_test_component.frontend", COMPONENT / "frontend.py")
    frontend = importlib.util.module_from_spec(frontend_spec)
    with patch.dict(sys.modules, interfaces):
        frontend_spec.loader.exec_module(frontend)
    return frontend


frontend = load_frontend_with_ha_interfaces()


class FrontendSetupTest(unittest.IsolatedAsyncioTestCase):
    async def test_multiple_entries_serve_once_and_register_a_single_real_module(self):
        paths = []

        async def register_static(value):
            await asyncio.sleep(0)
            paths.extend(value)

        collection = StoredResources([OTHER])
        hass = SimpleNamespace(data={"lovelace": SimpleNamespace(resources=collection)},
                               http=SimpleNamespace(async_register_static_paths=register_static))
        await asyncio.gather(*(frontend.async_setup_frontend(hass) for _ in range(3)))
        self.assertEqual(len(paths), 1)
        self.assertEqual(paths[0].url_path, URL.split("?")[0])
        self.assertFalse(paths[0].cache_headers)
        self.assertIn("customElements.define('tempo-vivo-card'", Path(paths[0].path).read_text())
        self.assertEqual(collection.loads, 1)
        self.assertEqual(collection.writes, 1)
        self.assertEqual(collection.stored[0], OTHER)

    async def test_resource_failure_logs_the_exact_fallback_and_can_retry(self):
        class Failure(StoredResources):
            async def async_load(self):
                raise OSError("storage unavailable")

        paths = []

        async def register_static(value):
            paths.extend(value)

        hass = SimpleNamespace(data={"lovelace": {"resources": Failure([OTHER])}},
                               http=SimpleNamespace(async_register_static_paths=register_static))
        with self.assertLogs(frontend._LOGGER, level="ERROR") as logs:
            await frontend.async_setup_frontend(hass)
        self.assertIn(URL, logs.output[0])
        collection = StoredResources([OTHER])
        hass.data["lovelace"]["resources"] = collection
        await frontend.async_setup_frontend(hass)
        self.assertEqual(len(paths), 1)
        self.assertEqual(len(collection.stored), 2)

    async def test_yaml_mode_logs_actionable_resource_instruction(self):
        async def register_static(value):
            pass

        collection = SimpleNamespace(loaded=True, async_items=lambda: [OTHER])
        hass = SimpleNamespace(data={"lovelace": {"resources": collection}},
                               http=SimpleNamespace(async_register_static_paths=register_static))
        with self.assertLogs(frontend._LOGGER, level="WARNING") as logs:
            await frontend.async_setup_frontend(hass)
        self.assertIn(URL, logs.output[0])
        self.assertIn("type: module", logs.output[0])


if __name__ == "__main__":
    unittest.main()
