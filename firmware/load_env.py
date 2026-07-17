"""Load firmware/.env values into PlatformIO C++ defines."""

from pathlib import Path

Import("env")

env_file = Path(env.get("PROJECT_DIR")) / ".env"
values = {}

if env_file.exists():
    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip().strip('"').strip("'")
        values[key.strip()] = value

required = ("WIFI_SSID", "WIFI_PASSWORD", "BACKEND_URL", "DEVICE_TOKEN")
missing = [key for key in required if not values.get(key)]
if missing:
    raise RuntimeError(
        f"Missing {', '.join(missing)} in {env_file}. "
        "Copy .env.example to .env and fill in the values."
    )

for key in required:
    # Escape quotes explicitly so values remain one C++ string macro on
    # Windows, including SSIDs containing spaces.
    escaped = values[key].replace('\\', '\\\\').replace('"', '\\"')
    env.Append(CPPDEFINES=[f'{key}=\\"{escaped}\\"'])
