const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const PantryDatabase = require('./database');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile('index.html');
  
  // Open DevTools in development
  if (process.argv.includes('--enable-logging')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handlers
ipcMain.handle('get-categories', async () => {
  try {
    return db.getAllCategories();
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
});

ipcMain.handle('get-subcategories', async (event, categoryId) => {
  try {
    if (categoryId) {
      return db.getSubcategoriesByCategory(categoryId);
    }
    return db.getAllSubcategories();
  } catch (error) {
    console.error('Error getting subcategories:', error);
    return [];
  }
});

ipcMain.handle('add-subcategory', async (event, data) => {
  try {
    const id = Date.now().toString();
    db.addSubcategory(id, data.name, data.category_id);
    return { success: true, id };
  } catch (error) {
    console.error('Error adding subcategory:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-subcategory', async (event, id, name) => {
  try {
    db.updateSubcategory(id, name);
    return { success: true };
  } catch (error) {
    console.error('Error updating subcategory:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-subcategory', async (event, id) => {
  try {
    db.deleteSubcategory(id);
    return { success: true };
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-items', async () => {
  try {
    return db.getAllItems();
  } catch (error) {
    console.error('Error getting items:', error);
    return [];
  }
});

ipcMain.handle('add-item', async (event, item) => {
  try {
    db.addItem(item);
    return { success: true };
  } catch (error) {
    console.error('Error adding item:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-item', async (event, id, updates) => {
  try {
    db.updateItem(id, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating item:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-item', async (event, id) => {
  try {
    db.deleteItem(id);
    return { success: true };
  } catch (error) {
    console.error('Error deleting item:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-stats', async () => {
  try {
    return db.getStats();
  } catch (error) {
    console.error('Error getting stats:', error);
    return { totalItems: 0, totalCategories: 0, lowStock: 0, outOfStock: 0 };
  }
});

app.whenReady().then(() => {
  db = new PantryDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (db) {
    db.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (db) {
    db.close();
  }
});
