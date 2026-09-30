# Tempo Vivo 2

Card animado para Home Assistant: clima atual em cima, **temperatura e umidade da casa embaixo**. Sem faixa de previsão dos próximos dias.

![Card real em chuva](docs/card-chuva.webp)

## O que mudou na versão 2

- Céu desenhado em Canvas: sol, lua, estrelas, nuvens, chuva, temporal, neve, granizo, neblina, vento e efeito de calor.
- Transições de 3 segundos: nuvens chegam antes da chuva; a chuva para antes de as nuvens saírem. Atualizações de sensores preservam a cena.
- O card é carregado automaticamente pela integração. Não é necessário cadastrar um recurso Lovelace numa instalação nova.
- Editor gráfico para selecionar entidades, tema, animações, limite de calor e temperaturas por cômodo.
- A entidade `weather` pode ser usada diretamente; o sensor da integração continua funcionando.
- Valores indisponíveis, sensores removidos e diferenças entre °C e °F são tratados.
- A animação pausa fora da tela e segue a preferência de movimento reduzido do navegador.

## Instalar pelo HACS

Requer Home Assistant 2024.8 ou posterior e um navegador moderno.

1. No HACS, abra **Repositórios personalizados** e adicione `https://github.com/Douglaslopes24/Tempo-vivo`, categoria **Integração**.
2. Baixe **Tempo Vivo** e reinicie o Home Assistant.
3. Em **Configurações → Dispositivos e serviços → Adicionar integração**, procure **Tempo Vivo**. Selecione a entidade de clima e, se quiser, os sensores da casa.
4. Recarregue o navegador. Em **Editar painel → Adicionar cartão**, procure **Tempo Vivo** e selecione as entidades no editor.
5. Em Home Assistant 2026.6 ou posterior, o card também é sugerido ao selecionar uma entidade `weather` ou o sensor da integração.

## Atualizar a versão 1

1. No HACS, use **Atualizar** ou **Baixar novamente** para obter a versão 2.
2. Se você cadastrou o recurso `/tempo_vivo/tempo-vivo-card.js` na versão anterior, remova **somente esse recurso** de **Configurações → Painéis → Recursos**. A integração agora carrega o módulo automaticamente com a versão na URL.
3. Reinicie o Home Assistant e recarregue com Ctrl+F5. No aplicativo, feche e abra o painel se necessário.
4. Adicione o cartão **Tempo Vivo**, ou edite o cartão existente. O sensor agregado da instalação anterior continua sendo aceito, mesmo que seu ID tenha o nome repetido.

## YAML mínimo

Pode usar a entidade meteorológica diretamente:

```yaml
type: custom:tempo-vivo-card
entity: weather.sua_casa
indoor_temperature: sensor.temperatura_da_casa
indoor_humidity: sensor.umidade_da_casa
```

Ou o sensor agregado criado pela integração:

```yaml
type: custom:tempo-vivo-card
entity: sensor.tempo_vivo
```

Troque os exemplos pelos IDs reais. O seletor tenta encontrar a entidade automaticamente.

## Opções

| Opção | Função | Padrão |
| --- | --- | --- |
| `entity` | Entidade `weather` ou sensor Tempo Vivo | Obrigatória |
| `title` | Título | `Tempo agora` |
| `location` | Nome do local | Nome da entidade de clima |
| `theme` | `auto`, `dark`, `light` | `auto` |
| `animation` | Ativar movimento | `true` |
| `heat_threshold` | Limite de calor **em °C**; use `false` para desligar | `35` |
| `indoor_temperature` | Sensor de temperatura interna | Seleção da integração |
| `indoor_humidity` | Sensor de umidade interna | Seleção da integração |
| `outdoor_temperature`, `outdoor_humidity` | Sensores externos que substituem os dados da entidade weather | Entidade weather |
| `wind`, `pressure`, `visibility`, `feels_like` | Sensores de medidas atuais | Entidade weather |
| `sun_entity` | Entidade de posição e horários do sol | `sun.sun` |
| `sunrise`, `sunset` | Sensores de horário alternativos | `sun.sun` |
| `rain_sensor` | Sensor binário de chuva; `on` ativa a cena de chuva | Opcional |
| `storm_alert` | Sensor binário de temporal; `on` ativa a cena de temporal | Opcional |
| `heat_alert` | Sensor binário de onda de calor; `on` mostra o alerta | Opcional |
| `rooms` | Lista de sensores por cômodo | Opcional |
| `weather_entity` | Origem meteorológica explícita, usada com o agregado | Opcional |

Temperaturas são convertidas para a unidade do painel. O limite numérico exibe **Calor intenso**; **Onda de calor** é mostrado quando o sensor de alerta configurado fica `on`. Chuva, temporal e neve têm prioridade visual sobre o efeito de calor. O card acompanha o estado fornecido pelo Home Assistant; não prevê sozinho o começo da chuva.

```yaml
type: custom:tempo-vivo-card
entity: weather.sua_casa
title: Tempo agora
location: Minha casa
indoor_temperature: sensor.temperatura_da_casa
indoor_humidity: sensor.umidade_da_casa
heat_threshold: 35
animation: true
theme: dark
rooms:
  - name: Sala
    entity: sensor.temperatura_sala
  - name: Quarto
    entity: sensor.temperatura_quarto
    humidity_entity: sensor.umidade_quarto
```

## Demonstração do código real

Baixe [demo.html](demo.html) e abra no navegador. É um arquivo completo e funciona sem Home Assistant. Os botões simulam as mudanças de clima e o editor usa os mesmos componentes do card instalado. Os valores são de demonstração.

![Card no celular](docs/card-celular.webp)

## Instalação manual

Copie `custom_components/tempo_vivo` para `<config>/custom_components/tempo_vivo`. Reinicie, adicione a integração e recarregue o navegador. O JavaScript acompanha a pasta da integração.

Para usar somente o JavaScript, copie `tempo-vivo-card.js` para `<config>/www/`, registre `/local/tempo-vivo-card.js` como **Módulo JavaScript** e configure uma entidade `weather` diretamente.

## Se o card não aparecer

- Confira se a integração **Tempo Vivo** foi adicionada e carregada, além de instalada no HACS.
- Recarregue o navegador depois de adicionar a integração. Remova o antigo recurso manual do Tempo Vivo se estiver migrando da versão 1.
- Em um card Manual, use `type: custom:tempo-vivo-card`.
- Para confirmar o arquivo está disponível, abra `/tempo_vivo/tempo-vivo-card.js?v=2.0.0` no mesmo endereço do seu Home Assistant. Deve aparecer JavaScript.
- Se houver falha no carregamento da integração, consulte **Configurações → Sistema → Registros**.

## Verificação

O card foi executado em Chromium isolado com estados simulados do Home Assistant: 18 verificações passaram, incluindo transições, editor, dados indisponíveis, conversão de unidades e atualização ao vivo. Também foi inspecionado com 780 e 320 pixels de largura. As capturas deste README vêm do código real. O comportamento numa instância particular depende das entidades e da versão do Home Assistant; não houve acesso à instalação do usuário.

Para repetir: `python3 tools/build_demo.py`, `python3 tests/test_sources.py`, `npm install`, `npx playwright install chromium` e `npm test`. CI executa o navegador e Hassfest.

## Referências de estrutura

Foram consultados [Clock Weather Card](https://github.com/pkissling/clock-weather-card), [Dynamic Weather Card](https://github.com/teuchezh/dynamic-weather-card) e a [documentação de custom cards do Home Assistant](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/). A implementação usa componentes próprios e não carrega bibliotecas, imagens ou scripts externos no painel.

Licença MIT.
