"""Shared configuration keys."""
DOMAIN = "tempo_vivo"
VERSION = "2.0.0"
FIELDS = (
    "weather", "indoor_temperature", "indoor_humidity", "outdoor_temperature",
    "outdoor_humidity", "wind", "pressure", "visibility", "sunrise", "sunset",
    "heat_alert", "rain_sensor", "storm_alert", "feels_like",
)
WEATHER_ATTRIBUTES = (
    "temperature", "apparent_temperature", "humidity", "pressure", "wind_speed",
    "wind_bearing", "visibility", "temperature_unit", "pressure_unit", "wind_speed_unit",
    "visibility_unit",
)


def configured_sources(entry):
    """Options are a complete snapshot, so removing a field removes its source."""
    values = entry.options if "weather" in entry.options else entry.data
    return {key: value for key, value in values.items() if key in FIELDS and value}
