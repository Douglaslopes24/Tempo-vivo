# Ceuvia Weather Card

Animated Weather Card for Home Assistant. Current weather above, home temperature below.

## HACS installation

Requires Home Assistant 2024.8 or newer and a modern browser.

1. In HACS, open **Custom repositories** and add `https://github.com/Douglaslopes24/Tempo-vivo`, category **Integration**.
2. Download **Ceuvia Weather Card** and restart Home Assistant.
3. Open **Settings → Devices & services → Add integration → Ceuvia Weather Card**. Select a weather entity and optional home sensors.
4. Reload the browser. Edit your dashboard, add **Ceuvia Weather Card**, and select entities in its visual editor.

```yaml
type: custom:ceuvia-weather-card
entity: weather.your_home
indoor_temperature: sensor.home_temperature
indoor_humidity: sensor.home_humidity
language: auto
animation_quality: balanced
transition_duration: 4.5
```

Use your actual entity IDs. Portuguese and English are supported; `language: auto` follows Home Assistant. You can force `pt-BR` or `en` in the editor.

## Manual installation

Download the release ZIP and merge its `custom_components` folder into your Home Assistant configuration directory. Restart and add the integration. The internal folder remains `tempo_vivo` for upgrade compatibility.

For a standalone card, copy the release asset `ceuvia-weather-card.js` to `www` and add `/local/ceuvia-weather-card.js?v=3.0.0` as a **JavaScript module**. This mode uses the existing entities directly.

## Module registration and troubleshooting

Storage dashboards receive `/ceuvia/ceuvia-weather-card.js?v=3.0.0` automatically. For YAML-managed resources, append this module to the existing resource list:

```yaml
- url: /ceuvia/ceuvia-weather-card.js?v=3.0.0
  type: module
```

If the custom element is missing, verify the module URL and reload. A 404 means the integration is not serving the file: check that it is added under Devices & services and inspect the integration logs. A HACS download alone does not activate the integration.

## Upgrade from Tempo Vivo

Update the same repository. The old `custom:tempo-vivo-card` type, source settings and existing sensor IDs remain supported. See [migration guide](MIGRATION.md).

## Animation

Cloud depth and shadows, layered motion, perspective rain, wind, branching lightning, textured moon, heat refraction, snow, hail and fog. Clouds arrive before rain starts; rain stops before clouds depart.

Quality: `low` (up to 24 fps), `balanced` (up to 30 fps) or `high` (up to 60 fps). The transition duration accepts 2–12 seconds. Animation pauses outside the viewport and honors reduced-motion preferences. Actual performance depends on the device.

The card follows Home Assistant states. A numeric temperature threshold marks intense heat; a configured alert sensor marks a heat wave. It does not independently predict rain or declare official weather alerts.

MIT license. No external script, image service or analytics is used by the card.
