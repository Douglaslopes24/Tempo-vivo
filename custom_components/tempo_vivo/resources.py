"""Persist the card resource without overwriting other dashboard resources."""


async def async_register_resource(lovelace_data, url: str) -> bool:
    """Support both legacy dictionaries and current LovelaceData instances.

    False means resources are unavailable or managed in configuration.yaml.
    Errors propagate to the caller so it can log an actionable fallback.
    The caller serializes setup calls using a per-Home-Assistant lock.
    """
    resources = (
        lovelace_data.get("resources")
        if isinstance(lovelace_data, dict)
        else getattr(lovelace_data, "resources", None)
    )
    if resources is None or not hasattr(resources, "async_create_item"):
        return False

    # Old versions do not load storage before creation. New versions may load
    # again during updates unless loaded is set. Load before reading/mutating
    # so existing HACS/custom-card resources cannot be lost on first startup.
    if not resources.loaded:
        await resources.async_load()
        resources.loaded = True

    path = url.split("?", 1)[0]
    matches = [
        item for item in resources.async_items()
        if item.get("url", "").split("?", 1)[0] == path
    ]
    data = {"url": url, "res_type": "module"}
    if not matches:
        await resources.async_create_item(data)
        return True

    first, *duplicates = matches
    if first.get("url") != url or first.get("type") != "module":
        await resources.async_update_item(first["id"], data)
    for duplicate in duplicates:
        await resources.async_delete_item(duplicate["id"])
    return True
