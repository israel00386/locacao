# Apps (Android e Windows)

Os dois apps abrem o mesmo sistema publicado (https://locacao-taupe.vercel.app). Por isso "se conversam":
usam o mesmo servidor e o mesmo banco (Neon). O que é lançado no celular aparece no computador e vice-versa.
Atualizações do sistema (deploy na Vercel) chegam nos dois apps sem reinstalar.

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
