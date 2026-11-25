// LOCAR Equipamentos para Windows: janela do sistema publicado (mesmos dados do celular e do site).
const { app, BrowserWindow, Menu, shell, ipcMain } = require("electron");
const path = require("path");

const APP_URL = process.env.LOCAR_URL || "https://locacao-taupe.vercel.app";
const ORIGIN = new URL(APP_URL).origin;
let win;

const isInternal = (url) => {
  try {
    return new URL(url).origin === ORIGIN;
  } catch {
    return false;
  }
};

function loadApp(w) {
  w.loadURL(APP_URL).catch(() => {});
}

function createWindow() {
  win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 380,
    minHeight: 600,
    show: false,
    title: "LOCAR Equipamentos",
    backgroundColor: "#f3f5fa",
    icon: path.join(__dirname, "build", "icon.png"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });
  win.webContents.setUserAgent(`${win.webContents.getUserAgent()} LocarApp/1.0 (Windows)`);
  win.once("ready-to-show", () => win.show());

  // Links para fora (WhatsApp, Instagram, mapas…) abrem no navegador padrão.
  // O documento/recibo (/o/...) abre numa janela própria, onde "PDF / Imprimir" funciona.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternal(url)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: { width: 980, height: 900, autoHideMenuBar: true, backgroundColor: "#e5e5e5", title: "Documento — LOCAR", icon: path.join(__dirname, "build", "icon.png") },
      };
    }
    if (/^(https?|mailto|tel):/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!isInternal(url)) {
      e.preventDefault();
      if (/^(https?|mailto|tel):/i.test(url)) shell.openExternal(url);
    }
  });

  // Sem internet: mostra aviso com "Tentar de novo".
  win.webContents.on("did-fail-load", (_e, code, _desc, url, isMainFrame) => {
    if (isMainFrame && code !== -3 && isInternal(url)) win.loadFile(path.join(__dirname, "offline.html"));
  });

  loadApp(win);
}

ipcMain.on("locar:retry", () => win && loadApp(win));

// Só uma janela do app aberta por vez.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(() => {
    app.setAppUserModelId("br.com.locarequipamentos.desktop");
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: "Arquivo",
          submenu: [
            { label: "Recarregar", accelerator: "F5", click: () => win && win.webContents.reload() },
            { label: "Início", accelerator: "Alt+Home", click: () => win && loadApp(win) },
            { type: "separator" },
            { label: "Sair", role: "quit" },
          ],
        },
        { label: "Editar", submenu: [{ role: "undo", label: "Desfazer" }, { role: "redo", label: "Refazer" }, { type: "separator" }, { role: "cut", label: "Recortar" }, { role: "copy", label: "Copiar" }, { role: "paste", label: "Colar" }, { role: "selectAll", label: "Selecionar tudo" }] },
        { label: "Exibir", submenu: [{ role: "zoomIn", label: "Aumentar" }, { role: "zoomOut", label: "Diminuir" }, { role: "resetZoom", label: "Tamanho normal" }, { type: "separator" }, { role: "togglefullscreen", label: "Tela cheia" }] },
      ]),
    );
    createWindow();
  });
  app.on("window-all-closed", () => app.quit());
}
