"""Build a reproducible install bundle, standalone card, demo and checksums."""
import hashlib
import json
from pathlib import Path
import shutil
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
COMPONENT = ROOT / "custom_components/tempo_vivo"


def build():
    version = json.loads((COMPONENT / "manifest.json").read_text())["version"]
    output = ROOT / "dist"
    output.mkdir(exist_ok=True)
    archive = output / f"ceuvia-weather-card-v{version}.zip"
    files = [p for p in COMPONENT.rglob("*") if p.is_file() and "__pycache__" not in p.parts and p.suffix != ".pyc"]
    files += [ROOT / name for name in ["LICENSE", "README.md", "SUPPORT.md", "CHANGELOG.md", "demo.html"]]
    files += [p for p in (ROOT / "docs").rglob("*") if p.is_file() and p.suffix != ".png"]
    with ZipFile(archive, "w", ZIP_DEFLATED, compresslevel=9) as bundle:
        for path in sorted(files):
            info = ZipInfo(path.relative_to(ROOT).as_posix(), date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            bundle.writestr(info, path.read_bytes())
    shutil.copyfile(COMPONENT / "ceuvia-weather-card.js", output / "ceuvia-weather-card.js")
    shutil.copyfile(ROOT / "demo.html", output / "demo.html")
    products = [archive, output / "ceuvia-weather-card.js", output / "demo.html"]
    checksums = "\n".join(f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}" for path in products) + "\n"
    (output / "SHA256SUMS.txt").write_text(checksums)
    print(json.dumps({"version": version, "assets": [path.name for path in products] + ["SHA256SUMS.txt"]}))


if __name__ == "__main__":
    build()
