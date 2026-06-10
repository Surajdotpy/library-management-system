const { app, BrowserWindow, ipcMain, safeStorage, session, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');

let mainWindow;
let updateCheckInterval = null;
const AUTH_SESSION_FILENAME = 'auth-session.json';
const DEV_SERVER_URL = process.env.ELECTRON_RENDERER_URL || 'http://localhost:3000';
const PRODUCTION_INDEX_PATH = path.resolve(__dirname, '../dist/index.html');
const isDev = !app.isPackaged;

function getDevServerOrigin() {
  try {
    return new URL(DEV_SERVER_URL).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

const DEV_SERVER_ORIGIN = getDevServerOrigin();

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function getAuthSessionFilePath() {
  return path.join(app.getPath('userData'), AUTH_SESSION_FILENAME);
}

function readStoredAuthSession() {
  try {
    const filePath = getAuthSessionFilePath();

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const storedValue = fs.readFileSync(filePath, 'utf8');

    if (!storedValue) {
      return null;
    }

    if (safeStorage.isEncryptionAvailable()) {
      const decrypted = safeStorage.decryptString(Buffer.from(storedValue, 'base64'));
      return JSON.parse(decrypted);
    }

    return JSON.parse(storedValue);
  } catch (error) {
    console.error('Failed to read stored auth session:', error);
    return null;
  }
}

function writeStoredAuthSession(nextSession) {
  try {
    const filePath = getAuthSessionFilePath();
    const serialized = JSON.stringify(nextSession);

    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(serialized);
      fs.writeFileSync(filePath, encrypted.toString('base64'), 'utf8');
      return nextSession;
    }

    fs.writeFileSync(filePath, serialized, 'utf8');
    return nextSession;
  } catch (error) {
    console.error('Failed to persist auth session:', error);
    return null;
  }
}

function clearStoredAuthSession() {
  try {
    const filePath = getAuthSessionFilePath();

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Failed to clear stored auth session:', error);
  }
}

function isTrustedRendererSender(event) {
  const senderUrl = event.senderFrame?.url || event.sender?.getURL?.() || '';

  if (isDev) {
    return senderUrl.startsWith(DEV_SERVER_ORIGIN);
  }

  return senderUrl.startsWith('file://');
}

function ensureTrustedRendererSender(event) {
  if (!isTrustedRendererSender(event)) {
    throw new Error('Blocked IPC request from an untrusted renderer');
  }
}

function isAllowedExternalUrl(rawUrl) {
  try {
    const parsedUrl = new URL(rawUrl);

    if (parsedUrl.protocol === 'https:') {
      return true;
    }

    return (
      isDev &&
      parsedUrl.protocol === 'http:' &&
      (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

let updateState = {
  status: isDev ? 'dev' : 'idle',
  currentVersion: app.getVersion(),
  targetVersion: null,
  progress: null,
  notes: null,
  releaseDate: null,
  checkedAt: null,
  error: null,
};

function sendUpdateState() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('app-update:state', updateState);
}

function setUpdateState(patch) {
  updateState = {
    ...updateState,
    ...patch,
  };

  sendUpdateState();
}

function normalizeReleaseNotes(releaseNotes) {
  if (typeof releaseNotes === 'string') {
    return releaseNotes;
  }

  if (Array.isArray(releaseNotes)) {
    return releaseNotes
      .map((entry) => {
        if (!entry) {
          return '';
        }

        if (typeof entry === 'string') {
          return entry;
        }

        if (typeof entry.note === 'string') {
          return entry.note;
        }

        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }

  return null;
}

async function checkForUpdates() {
  if (isDev) {
    setUpdateState({
      status: 'dev',
      checkedAt: new Date().toISOString(),
      error: null,
    });
    return updateState;
  }

  try {
    await autoUpdater.checkForUpdates();
    return updateState;
  } catch (error) {
    setUpdateState({
      status: 'error',
      checkedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
    return updateState;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#f9fafb',
    show: false,
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) {
      return;
    }

    console.error(
      `Main window failed to load (${errorCode}): ${errorDescription}. URL: ${validatedURL || 'unknown'}`
    );
  });

  if (isDev) {
    void mainWindow.loadURL(DEV_SERVER_URL);
  } else {
    if (!fs.existsSync(PRODUCTION_INDEX_PATH)) {
      console.error(`Renderer entry file not found: ${PRODUCTION_INDEX_PATH}`);
    }

    void mainWindow.loadFile(PRODUCTION_INDEX_PATH);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    sendUpdateState();

    void checkForUpdates();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    sendUpdateState();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      void shell.openExternal(url);
    }

    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url === mainWindow.webContents.getURL()) {
      return;
    }

    event.preventDefault();

    if (isAllowedExternalUrl(url)) {
      void shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('app-update:get-state', async (event) => {
  return updateState;
});
ipcMain.handle('app-update:check', async (event) => {
  ensureTrustedRendererSender(event);
  return checkForUpdates();
});
ipcMain.handle('app-update:download', async (event) => {
  ensureTrustedRendererSender(event);

  if (isDev) {
    return updateState;
  }

  if (updateState.status !== 'available') {
    return updateState;
  }

  try {
    await autoUpdater.downloadUpdate();
    return updateState;
  } catch (error) {
    setUpdateState({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      checkedAt: new Date().toISOString(),
    });
    return updateState;
  }
});
ipcMain.handle('app-update:install', async (event) => {
  ensureTrustedRendererSender(event);

  if (isDev || updateState.status !== 'downloaded') {
    return;
  }

  autoUpdater.quitAndInstall(false, true);
});

ipcMain.on('auth-session:get', (event) => {
  if (!isTrustedRendererSender(event)) {
    event.returnValue = null;
    return;
  }

  event.returnValue = readStoredAuthSession();
});

ipcMain.on('auth-session:set', (event, nextSession) => {
  if (!isTrustedRendererSender(event)) {
    event.returnValue = null;
    return;
  }

  event.returnValue = writeStoredAuthSession(nextSession);
});

ipcMain.on('auth-session:clear', (event) => {
  if (!isTrustedRendererSender(event)) {
    event.returnValue = false;
    return;
  }

  clearStoredAuthSession();
  event.returnValue = true;
});

autoUpdater.on('checking-for-update', () => {
  setUpdateState({
    status: 'checking',
    checkedAt: new Date().toISOString(),
    error: null,
  });
});

autoUpdater.on('update-available', (info) => {
  setUpdateState({
    status: 'available',
    targetVersion: info.version ?? null,
    progress: 0,
    notes: normalizeReleaseNotes(info.releaseNotes),
    releaseDate: info.releaseDate ?? null,
    checkedAt: new Date().toISOString(),
    error: null,
  });
});

autoUpdater.on('update-not-available', () => {
  setUpdateState({
    status: 'idle',
    targetVersion: null,
    progress: null,
    notes: null,
    releaseDate: null,
    checkedAt: new Date().toISOString(),
    error: null,
  });
});

autoUpdater.on('download-progress', (progress) => {
  setUpdateState({
    status: 'downloading',
    progress: Math.round(progress.percent),
    error: null,
  });

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setProgressBar(progress.percent / 100);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setProgressBar(-1);
  }

  setUpdateState({
    status: 'downloaded',
    targetVersion: info.version ?? updateState.targetVersion,
    progress: 100,
    notes: normalizeReleaseNotes(info.releaseNotes),
    releaseDate: info.releaseDate ?? updateState.releaseDate,
    checkedAt: new Date().toISOString(),
    error: null,
  });
});

autoUpdater.on('error', (error) => {
  setUpdateState({
    status: 'error',
    checkedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
  });
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  createWindow();

  if (!isDev) {
    updateCheckInterval = setInterval(() => {
      void checkForUpdates();
    }, 30 * 60 * 1000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      mainWindow.focus();
    }
  });
}
