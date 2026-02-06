const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 600,
    title: 'Sultan',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#030712',
    show: false,
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173/');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
const SAVE_DIR = path.join(app.getPath('userData'), 'saves');

ipcMain.handle('save:write', async (event, saveId, data) => {
  if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
  }
  const filePath = path.join(SAVE_DIR, `${saveId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return { success: true, path: filePath };
});

ipcMain.handle('save:read', async (event, saveId) => {
  const filePath = path.join(SAVE_DIR, `${saveId}.json`);
  if (!fs.existsSync(filePath)) {
    return { success: false, error: 'Save not found' };
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return { success: true, data };
});

ipcMain.handle('save:list', async () => {
  if (!fs.existsSync(SAVE_DIR)) return { success: true, saves: [] };
  const files = fs.readdirSync(SAVE_DIR).filter(f => f.endsWith('.json'));
  return {
    success: true,
    saves: files.map(f => f.replace('.json', '')),
  };
});

ipcMain.handle('save:delete', async (event, saveId) => {
  const filePath = path.join(SAVE_DIR, `${saveId}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return { success: true };
  }
  return { success: false, error: 'Save not found' };
});
