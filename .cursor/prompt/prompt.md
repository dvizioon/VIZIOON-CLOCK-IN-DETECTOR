Estou criando um app em React Native com Expo (SDK 57). Preciso que você crie o prebuild do projeto para gerar a pasta nativa do Android (android/) e, em seguida, me ajude a implementar um Módulo Nativo em Kotlin.

O objetivo desse módulo nativo é monitorar dois eventos de sistema no Android:
1. Saber quando o aplicativo do TOTVS Clock-in (precisamos definir o package name) vier para o primeiro plano.
2. Monitorar o uso da câmera (via CameraManager.AvailabilityCallback) para detectar quando o reconhecimento facial for disparado.

Pode começar rodando o comando npx expo prebuild --platform android para gerar a estrutura nativa e depois me guiar na criação do serviço nativo em Kotlin e sua bridge para o TypeScript?