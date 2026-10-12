# Atualizar do Tempo Vivo para Ceuvia

Ceuvia Weather Card 3.0.0 é a continuação do Tempo Vivo. Atualize o mesmo repositório no HACS; não precisa criar outra instalação.

1. Em **HACS → Tempo Vivo / Ceuvia Weather Card**, escolha **Atualizar** ou **Baixar novamente** e selecione **3.0.0**.
2. Reinicie o Home Assistant.
3. Recarregue o painel com **Ctrl+F5**. No aplicativo, feche e abra o painel.
4. O seletor de cartões e a integração aparecem como **Ceuvia Weather Card**.

## Cartões já existentes

O YAML antigo continua funcionando:

```yaml
type: custom:tempo-vivo-card
entity: weather.forecast_casa
```

Novos cartões usam:

```yaml
type: custom:ceuvia-weather-card
entity: weather.forecast_casa
```

Os campos de sensores, cômodos, tema e animação são os mesmos. A atualização preserva os IDs dos sensores existentes. Nomes personalizados da integração também são preservados.

## Recursos do painel

Em painéis gerenciados pela interface, a integração migra seu próprio recurso para:

```text
/ceuvia/ceuvia-weather-card.js?v=3.0.0
```

O tipo é **Módulo JavaScript**. Recursos de outros cartões são preservados. A URL antiga `/tempo_vivo/tempo-vivo-card.js` também continua sendo servida.

Se os recursos forem gerenciados por YAML, atualize a URL manualmente dentro da seção `lovelace.resources` existente:

```yaml
- url: /ceuvia/ceuvia-weather-card.js?v=3.0.0
  type: module
```

## Instalação usando somente o JavaScript

Substitua o arquivo em `www` por `ceuvia-weather-card.js` e atualize o recurso para `/local/ceuvia-weather-card.js?v=3.0.0`, tipo **Módulo JavaScript**. O `type` antigo continua sendo aceito.

## Pasta interna e endereço do GitHub

A pasta `custom_components/tempo_vivo` e o domínio interno `tempo_vivo` são mantidos para preservar as instalações existentes. O nome apresentado ao usuário é Ceuvia Weather Card. O repositório continua em `Douglaslopes24/Tempo-vivo`.
