"""Build an offline demo using the exact production JavaScript."""
from pathlib import Path
root = Path(__file__).resolve().parents[1]
script = (root / 'custom_components/tempo_vivo/tempo-vivo-card.js').read_text()
fixture = (root / 'tests/demo-template.html').read_text()
(root / 'demo.html').write_text(fixture.replace('/* PRODUCTION_CARD */', script))
