# Olho Vivo SP Mobile - Mobilidade Urbana com API Olho Vivo

Aplicativo mobile em React Native com Expo (SDK 54) desenvolvido para a Global Solution 2026.2 de **Cross-Platform Application Development** da FIAP (Prof. Rodrigo Moraes). O app integra a API Olho Vivo da SPTrans (v2.1) com recursos nativos de GPS e alertas locais para auxiliar passageiros na mobilidade por ônibus no município de São Paulo.

## Funcionalidades

- **Autenticação e Persistência de Token:** Validação do token da API Olho Vivo via `POST /Login/Autenticar` com salvamento no `AsyncStorage` apenas quando a autenticação retorna `true` e suporte a troca/limpeza de sessão.
- **Perto de Mim (GPS, Distância e Alertas):** Obtém a localização do aparelho com `expo-location`, calcula a distância em metros até os pontos retornados pela API (fórmula de Haversine), exibe previsões de chegada e dispara notificação local (`expo-notifications`), alerta na tela (`Alert`) e vibração (`Vibration`).
- **Linhas & Mapa em Tempo Real:** Pesquisa linhas por número ou nome, exibe ônibus ativos e paradas no mapa (`react-native-maps`), permite filtrar veículos acessíveis (`a: true`) e monitora a aproximação do ponto de descida via GPS.
- **Corredores Exclusivos:** Consulta os corredores de ônibus cadastrados na SPTrans (`GET /Corredor`).
- **Acessibilidade e Identidade Visual:** Tema escuro FIAP com alternância para modo de alto contraste (`#000000`, `#ffffff` e `#ffff00`).

## Tecnologias Utilizadas

- React Native e Expo (SDK 54)
- `expo-location` (GPS e acompanhamento de posição)
- `expo-notifications` (notificações locais)
- `react-native-maps` (mapa nativo com marcadores e destaques)
- `@react-native-async-storage/async-storage` (persistência local do token)
- `react-native-safe-area-context` e `react-native-edge-to-edge` (áreas seguras e barras do sistema)

## Autenticação e Salvamento Automático do Token

O aplicativo foi pensado para evitar que você tenha que digitar o token da SPTrans toda vez que abrir o app:

1. **Validação antes de salvar:** Quando você insere o token e toca em **Entrar**, o app faz a chamada `POST /Login/Autenticar?token=SEU_TOKEN` na API Olho Vivo. O token **só é salvo** no `AsyncStorage` do aparelho se a API responder `true` — textos aleatórios ou inválidos são recusados e não ficam armazenados.
2. **Entrada automática nas próximas aberturas:** Ao abrir o aplicativo novamente, ele lê o token salvo no `AsyncStorage` e já valida automaticamente na API da SPTrans. Se estiver válido, você entra direto nas abas do app sem precisar preencher nada de novo.
3. **Sessão expirada ou troca de token:** Caso a API recuse o token salvo (por expiração ou revogação), o app remove o valor inválido do `AsyncStorage` e volta para a tela de token. Você também pode tocar em **Sair** no topo do app a qualquer momento para apagar o token salvo e digitar outro.

## Vídeo de Demonstração (YouTube)

Para a entrega do projeto, há um vídeo demonstrativo de até 3 minutos gravado diretamente em um smartphone real rodando o aplicativo com dados da API Olho Vivo da SPTrans:

- **Link do vídeo no YouTube:** <a href="https://youtu.be/fbO19RYTuMk">`https://youtu.be/fbO19RYTuMk`</a>

### O que é demonstrado no vídeo
- O aplicativo abrindo e funcionando em um celular real conectado à API Olho Vivo da SPTrans.
- A autenticação com o token da SPTrans e o salvamento automático para próximas aberturas.
- O uso do **GPS** (`expo-location`) para localizar pontos de ônibus próximos e calcular distâncias.
- O disparo de **alerta/notificação e vibração** ao monitorar a chegada ou desembarque.
- A visualização de linhas, veículos acessíveis e mapa em tempo real, além do modo de alto contraste.

## Estrutura do Projeto

```text
├── App.js
├── app.json
├── package.json
├── integrantes.txt
├── README.md
└── src/
    ├── theme/
    │   └── colors.js          # Temas FIAP Dark e Alto Contraste
    ├── services/
    │   ├── sptransApi.js      # Autenticação e endpoints da API Olho Vivo v2.1
    │   └── deviceServices.js  # GPS, distância Haversine, notificações e vibração
    └── components/
        ├── TokenScreen.js     # Tela de autenticação e validação de token salvo
        ├── NearbyStopsTab.js  # Pontos próximos via GPS, previsões e alertas
        ├── LinesMapTab.js     # Busca de linhas, mapa em tempo real e alerta de descida
        └── CorridorsTab.js    # Listagem de corredores exclusivos da SPTrans