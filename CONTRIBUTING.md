# Contribuir com Ceuvia

O card de produção está em `custom_components/tempo_vivo/ceuvia-weather-card.js`. O nome interno da integração e os aliases antigos são mantidos para atualizações compatíveis.

1. Instale as dependências de desenvolvimento com `npm ci`.
2. Gere a demonstração com `python3 tools/build_demo.py`.
3. Execute `python3 -m unittest discover -s tests -p 'test_*.py'`, `npm run check` e `npm test`.
4. Para o teste real de Home Assistant, use Python 3.12, instale `tests/requirements-ha.txt` em um ambiente virtual e execute `python tests/ha_smoke.py`.
5. Para conferir a distribuição, execute `python3 tools/build_release.py`. Os arquivos são gerados em `dist`.

Mudanças de comportamento precisam preservar cartões antigos, sensores e recursos de outros cards. Inclua testes para regressões reproduzíveis. Atualize as traduções de português e inglês quando alterar textos da interface.

Abra o pull request com o problema resolvido, o comportamento final e a validação realizada. Os testes e o Hassfest são executados automaticamente.
