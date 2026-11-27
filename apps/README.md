# Apps (Android e Windows)

Os dois apps abrem o mesmo sistema publicado (https://locacao-taupe.vercel.app). Por isso "se conversam":
usam o mesmo servidor e o mesmo banco (Neon). O que é lançado no celular aparece no computador e vice-versa.
Atualizações das telas web (deploy na Vercel) chegam nos dois apps sem reinstalar.
Mudanças nativas, como navegação e abertura de outros aplicativos, exigem instalar um novo APK.

## Android (APK) — `apps/android` (Capacitor 7)
Requisitos: Node, JDK 21, Android SDK (platform 35, build-tools 35) com `ANDROID_HOME`.
```bash
cd apps/android && npm ci
# assinatura: crie android/keystore.properties (NÃO vai para o git):
#   storeFile=../../locar-release.keystore
#   storePassword=...   keyAlias=locar   keyPassword=...
npm run apk   # gera android/app/build/outputs/apk/release/app-release.apk
```
Guarde o arquivo `locar-release.keystore` e a senha: sem eles, uma versão nova do APK não instala por cima da antiga.
Para trocar o endereço do sistema: `server.url` em `capacitor.config.json`.

## Windows (.exe) — `apps/desktop` (Electron 33)
Requisitos: Node, `makensis` (NSIS) e `zip`. Funciona no Linux sem Wine.
```bash
cd apps/desktop && npm ci && npm run exe
# dist/LOCAR-Equipamentos-Instalador-1.0.0.exe  (instalador, não pede administrador)
# dist/LOCAR-Equipamentos-Portatil-1.0.0.zip    (descompacte e abra "LOCAR Equipamentos.exe")
```
Para trocar o endereço do sistema: `APP_URL` em `main.js`.

## Android 1.1 — WhatsApp Business, PDF e Voltar

Links de WhatsApp tentam abrir primeiro o WhatsApp Business, preservando destinatário e mensagem.
Se ele não estiver disponível, o app avisa e permite cancelar ou escolher outro aplicativo.
Documentos `/o/...` abrem em uma janela de navegador (Custom Tab), com opção de fechar/voltar;
a locação permanece aberta na WebView original. PDF / Imprimir usa a impressão do navegador.
O botão/gesto Voltar do Android percorre o histórico do sistema; na primeira tela, usa o comportamento normal do Android.

A mensagem continua sendo texto com link do documento, não um anexo PDF. Para enviar o arquivo formal,
use Ver documento / PDF → PDF / Imprimir → Salvar como PDF e compartilhe o arquivo.

Esta atualização usa `versionCode 2`. Para atualizar o APK instalado, gere o release com a **mesma chave de assinatura** da versão anterior.

Validação: `cd apps/android && npm ci && npx cap sync android`; na pasta `android`, execute
`./gradlew testDebugUnitTest lintDebug assembleDebug` com JDK 21 e Android SDK 35.

Teste de aceitação em celular: com WhatsApp comum e Business instalados, abrir orçamento com/sem
telefone e conferir destinatário/texto sem enviar. Abrir documento, salvar/cancelar PDF e fechar;
conferir retorno à mesma locação e rolagem. Repetir com Business ausente (Cancelar/Escolher aplicativo).
Conferir também o gesto Voltar entre painel, lista e locação.
