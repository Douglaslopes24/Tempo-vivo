"""Release assets must install the actual frontend, preserve paths and verify."""
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest
from zipfile import ZipFile

ROOT = Path(__file__).parents[1]
spec = importlib.util.spec_from_file_location("ceuvia_release", ROOT / "tools/build_release.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class ReleasePackageTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        builder.build()
        cls.version = json.loads((ROOT / "custom_components/tempo_vivo/manifest.json").read_text())["version"]
        cls.archive = ROOT / "dist" / f"ceuvia-weather-card-v{cls.version}.zip"

    def test_zip_has_installable_component_and_correct_module(self):
        with ZipFile(self.archive) as archive:
            self.assertIsNone(archive.testzip())
            self.assertIn("custom_components/tempo_vivo/manifest.json", archive.namelist())
            self.assertIn("custom_components/tempo_vivo/ceuvia-weather-card.js", archive.namelist())
            self.assertIn("custom_components/tempo_vivo/translations/en.json", archive.namelist())
            self.assertFalse(any("__pycache__" in name or ".." in name.split("/") for name in archive.namelist()))

    def test_release_checksums_match_the_download_files(self):
        for line in (ROOT / "dist/SHA256SUMS.txt").read_text().splitlines():
            digest, name = line.split("  ", 1)
            self.assertEqual(hashlib.sha256((ROOT / "dist" / name).read_bytes()).hexdigest(), digest)

    def test_standalone_card_matches_packaged_code_and_has_both_types(self):
        code = (ROOT / "dist/ceuvia-weather-card.js").read_text()
        self.assertEqual(code, (ROOT / "custom_components/tempo_vivo/ceuvia-weather-card.js").read_text())
        self.assertIn("customElements.define('ceuvia-weather-card'", code)
        self.assertIn("customElements.define('tempo-vivo-card'", code)


if __name__ == "__main__":
    unittest.main()
