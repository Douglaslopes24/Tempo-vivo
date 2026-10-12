# Changelog

## 3.0.0 — Ceuvia Weather Card

- New Ceuvia name in HACS, integration setup, devices, card picker and documentation.
- Canonical card: `custom:ceuvia-weather-card`. Existing `custom:tempo-vivo-card` dashboards continue to render.
- Canonical module: `/ceuvia/ceuvia-weather-card.js`. Existing resources migrate while unrelated resources and sensor entity IDs are preserved.
- Portuguese and English UI with automatic language selection and a manual selector.
- Room temperatures support existing `sensor` and `climate` entities.
- Independent indoor data remains visible when the weather provider is unavailable.
- Complete installation and migration guides, examples, MIT license, issue templates and reproducible release assets with SHA-256 checksums.
- Automated tests for resources, aliases, editor, animation, languages, package contents and a real isolated Home Assistant instance.

## 2.1.0 — Natural weather animation

- Cloud volume with internal lighting, depth layers, rain perspective, wind, textured moon, branching lightning and heat refraction.
- Three quality profiles and configurable transitions.

## 2.0.1 — Reliable module loading

- Persisted Lovelace resource registration, versioned URLs and preservation of other cards.

## 2.0.0

- Rebuilt current-weather card, indoor temperature section and visual entity editor.
