const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { getBalances, withdraw, getNetworks } = require('./api');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
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

// 处理 API 请求
ipcMain.handle('get-balances', async (event, apiInfo) => {
  try {
    return await getBalances(apiInfo);
  } catch (error) {
    throw error.message;
  }
});

ipcMain.handle('withdraw', async (event, { apiInfo, coin, address, amount }) => {
  try {
    return await withdraw(apiInfo, coin, address, amount);
  } catch (error) {
    throw error.message;
  }
});

ipcMain.handle('get-networks', async (event, { apiInfo, coin }) => {
  try {
    return await getNetworks(apiInfo, coin);
  } catch (error) {
    throw error.message;
  }
}); 