# Tempo Vivo para Home Assistant

Card de clima animado com transições fluidas entre sol, nuvens, chuva, temporal, neve, neblina, vento e calor. A parte inferior mostra **temperatura da casa**, em lugar da previsão de vários dias. Usa entidades locais; não exige conta, chave de API ou serviço externo.

## Instalação via HACS (repositório personalizado)

Após publicar este código num repositório GitHub público, em HACS abra o menu de repositórios personalizados, cole a URL e selecione a categoria **Integração**. Instale Tempo Vivo e reinicie o Home Assistant. Depois siga os passos 3 a 5 abaixo. O arquivo do card já acompanha a integração.

## Instalação manual

1. Copie `custom_components/tempo_vivo` para `<config>/custom_components/tempo_vivo`.
2. Reinicie o Home Assistant.
3. Em **Configurações → Dispositivos e serviços → Adicionar integração → Tempo Vivo**, selecione a entidade `weather` e, opcionalmente, sensores de temperatura, umidade, vento, pressão, visibilidade, nascer/pôr do sol e alerta binário de calor.
4. No dashboard, abra **Editar painel → menu ⋮ → Recursos → Adicionar recurso**. URL: `/tempo_vivo/tempo-vivo-card.js`; tipo: **Módulo JavaScript**. Atualize a página.
5. Encontre a entidade criada pela integração em **Configurações → Dispositivos e serviços → Tempo Vivo → Entidades**. O ID costuma ser `sensor.tempo_vivo`, mas pode receber sufixo. Adicione um card manual:

```yaml
type: custom:tempo-vivo-card
entity: sensor.tempo_vivo
title: Tempo em casa
heat_threshold: 35
```

O limite de calor usa a mesma unidade numérica da temperatura externa. Um `binary_sensor` de alerta de calor também pode ativar o efeito. Chuva e temporal têm prioridade sobre o alerta.

## Opções do card

| Opção | Função |
| --- | --- |
| `entity` | Sensor agregado da integração (obrigatório) |
| `title` | Título da parte superior |
| `heat_threshold` | Limite para calor (padrão: 35; `false` desativa) |
| `weather_entity` | Outra entidade de clima neste card |
| `indoor_temperature`, `indoor_humidity`, `outdoor_temperature`, `outdoor_humidity`, `wind`, `pressure`, `visibility`, `sunrise`, `sunset`, `heat_alert` | Entidades opcionais que substituem a configuração da integração neste card |

```yaml
type: custom:tempo-vivo-card
entity: sensor.tempo_vivo
title: Sala
indoor_temperature: sensor.temperatura_sala
indoor_humidity: sensor.umidade_sala
```

Valores ausentes aparecem como `—` ou ficam ocultos. Para nascer e pôr do sol, adicione sensores de horário, caso os tenha. As animações respeitam a preferência de movimento reduzido do navegador.

## Atualização

Substitua a pasta da integração, reinicie o Home Assistant e atualize o painel. Se o navegador mantiver o card antigo, recarregue sem cache ou acrescente `?v=2` à URL do recurso.

Este projeto lê entidades existentes; não cria uma fonte meteorológica nem uma previsão nova. As transições ocorrem quando o Home Assistant atualiza a entidade `weather`. Instalação e funcionamento em uma instância real ainda precisam ser validados.
