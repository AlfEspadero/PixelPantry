const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Categories
  getCategories: () => ipcRenderer.invoke('get-categories'),
  
  // Subcategories
  getSubcategories: (categoryId) => ipcRenderer.invoke('get-subcategories', categoryId),
  addSubcategory: (data) => ipcRenderer.invoke('add-subcategory', data),
  updateSubcategory: (id, name) => ipcRenderer.invoke('update-subcategory', id, name),
  deleteSubcategory: (id) => ipcRenderer.invoke('delete-subcategory', id),
  
  // Items
  getItems: () => ipcRenderer.invoke('get-items'),
  addItem: (item) => ipcRenderer.invoke('add-item', item),
  updateItem: (id, updates) => ipcRenderer.invoke('update-item', id, updates),
  deleteItem: (id) => ipcRenderer.invoke('delete-item', id),
  
  // Stats
  getStats: () => ipcRenderer.invoke('get-stats'),
  
  // Cloud Sync
  testCloudConnection: () => ipcRenderer.invoke('test-cloud-connection'),
  pushToCloud: () => ipcRenderer.invoke('push-to-cloud'),
  pullFromCloud: () => ipcRenderer.invoke('pull-from-cloud')
});
