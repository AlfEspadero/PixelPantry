// Application State
let categories = [];
let subcategories = [];
let items = [];
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const inventoryGrid = document.getElementById('inventory-grid');
const categoriesList = document.getElementById('categories-list');
const addItemBtn = document.getElementById('add-item-btn');
const addItemModal = document.getElementById('add-item-modal');
const addItemForm = document.getElementById('add-item-form');
const searchInput = document.getElementById('search-input');
const filterCategory = document.getElementById('filter-category');
const closeModal = document.querySelector('.close');
const cancelBtn = document.getElementById('cancel-btn');

// Subcategories Modal
const manageSubcategoriesBtn = document.getElementById('manage-subcategories-btn');
const subcategoriesModal = document.getElementById('subcategories-modal');
const closeSubcategories = document.querySelector('.close-subcategories');
const subcategoryCategory = document.getElementById('subcategory-category');
const subcategoriesList = document.getElementById('subcategories-list');
const addSubcategoryForm = document.getElementById('add-subcategory-form');

// Edit Item Modal
const editItemModal = document.getElementById('edit-item-modal');
const editItemForm = document.getElementById('edit-item-form');
const closeEdit = document.querySelector('.close-edit');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

// Cloud Sync Elements
const cloudSyncBtn = document.getElementById('cloud-sync-btn');
const cloudSyncModal = document.getElementById('cloud-sync-modal');
const closeSync = document.querySelector('.close-sync');
const syncStatus = document.getElementById('sync-status');
const syncStatusMessage = document.getElementById('sync-status-message');
const pushToCloudBtn = document.getElementById('push-to-cloud-btn');
const pullFromCloudBtn = document.getElementById('pull-from-cloud-btn');
const testConnectionBtn = document.getElementById('test-connection-btn');

// Initialize App
async function init() {
  await loadCategories();
  await loadSubcategories();
  await loadItems();
  renderCategories();
  renderInventory();
  updateStats();
  populateCategorySelects();
}

// Load Categories
async function loadCategories() {
  categories = await window.electronAPI.getCategories();
}

// Load Subcategories
async function loadSubcategories() {
  subcategories = await window.electronAPI.getSubcategories();
}

// Load Items
async function loadItems() {
  items = await window.electronAPI.getItems();
}

// Render Categories
function renderCategories() {
  categoriesList.innerHTML = '';
  
  const allCategory = document.createElement('div');
  allCategory.className = 'category-item' + (currentFilter === 'all' ? ' active' : '');
  allCategory.innerHTML = `
    <span>All Items</span>
    <span>${items.length}</span>
  `;
  allCategory.onclick = () => {
    currentFilter = 'all';
    renderCategories();
    renderInventory();
  };
  categoriesList.appendChild(allCategory);

  categories.forEach(category => {
    const count = items.filter(item => item.category_id === category.id).length;
    const categoryItem = document.createElement('div');
    categoryItem.className = 'category-item' + (currentFilter === category.id ? ' active' : '');
    categoryItem.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <div class="category-color" style="background-color: ${category.color}"></div>
        <span>${category.name}</span>
      </div>
      <span>${count}</span>
    `;
    categoryItem.onclick = () => {
      currentFilter = category.id;
      renderCategories();
      renderInventory();
    };
    categoriesList.appendChild(categoryItem);
  });
}

// Render Inventory
function renderInventory() {
  const filteredItems = items.filter(item => {
    const matchesCategory = currentFilter === 'all' || item.category_id === currentFilter;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (filteredItems.length === 0) {
    inventoryGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <div class="empty-state-text">
          No items found.<br>
          Click "+ Add Item" to get started!
        </div>
      </div>
    `;
    return;
  }

  inventoryGrid.innerHTML = '';
  filteredItems.forEach(item => {
    const itemCard = document.createElement('div');
    
    let stockClass = '';
    let quantityClass = '';
    const threshold = item.low_stock_threshold || 3;
    
    if (item.quantity === 0) {
      stockClass = 'out-of-stock';
      quantityClass = 'empty';
    } else if (item.quantity <= threshold) {
      stockClass = 'low-stock';
      quantityClass = 'low';
    }

    itemCard.className = `inventory-item ${stockClass}`;
    itemCard.style.borderColor = item.category_color || '#4a4a4a';
    
    const subcategoryBadge = item.subcategory_name 
      ? `<div class="item-subcategory-badge">${item.subcategory_name}</div>` 
      : '';
    
    itemCard.innerHTML = `
      <div class="item-header">
        <div>
          <div class="item-name">${item.name}</div>
          <div class="item-category-badge" style="background-color: ${item.category_color || '#4a4a4a'}">
            ${item.category_name || 'Unknown'}
          </div>
          ${subcategoryBadge}
        </div>
      </div>
      <div class="item-quantity ${quantityClass}">
        ${item.quantity} ${item.unit || ''}
      </div>
      <div style="font-size: 8px; text-align: center; color: #a0a0a0; margin-bottom: 10px;">
        Low stock at: ${threshold}
      </div>
      <div class="item-controls">
        <button class="item-btn decrement" onclick="updateQuantity('${item.id}', -1)">-</button>
        <button class="item-btn increment" onclick="updateQuantity('${item.id}', 1)">+</button>
        <button class="item-btn delete" onclick="deleteItem('${item.id}')">×</button>
      </div>
      <button class="item-edit-btn" onclick="openEditModal('${item.id}')">Edit</button>
    `;
    
    inventoryGrid.appendChild(itemCard);
  });
}

// Update Item Quantity
window.updateQuantity = async function(itemId, change) {
  const item = items.find(i => i.id === itemId);
  if (item) {
    const newQuantity = Math.max(0, item.quantity + change);
    await window.electronAPI.updateItem(itemId, { quantity: newQuantity });
    await loadItems();
    renderInventory();
    updateStats();
  }
};

// Delete Item
window.deleteItem = async function(itemId) {
  if (confirm('Are you sure you want to delete this item?')) {
    await window.electronAPI.deleteItem(itemId);
    await loadItems();
    renderCategories();
    renderInventory();
    updateStats();
  }
};

// Open Edit Modal
window.openEditModal = async function(itemId) {
  const item = items.find(i => i.id === itemId);
  if (!item) return;

  document.getElementById('edit-item-id').value = item.id;
  document.getElementById('edit-item-name').value = item.name;
  document.getElementById('edit-item-category').value = item.category_id;
  document.getElementById('edit-item-quantity').value = item.quantity;
  document.getElementById('edit-item-unit').value = item.unit || '';
  document.getElementById('edit-item-low-stock').value = item.low_stock_threshold || 3;

  // Populate subcategories for selected category
  await populateSubcategoriesForCategory('edit-item-category', 'edit-item-subcategory');
  document.getElementById('edit-item-subcategory').value = item.subcategory_id || '';

  editItemModal.style.display = 'block';
};

// Edit Item Form Submit
editItemForm.onsubmit = async (e) => {
  e.preventDefault();
  
  const itemId = document.getElementById('edit-item-id').value;
  const updates = {
    name: document.getElementById('edit-item-name').value,
    category_id: document.getElementById('edit-item-category').value,
    subcategory_id: document.getElementById('edit-item-subcategory').value || null,
    quantity: parseInt(document.getElementById('edit-item-quantity').value),
    unit: document.getElementById('edit-item-unit').value,
    low_stock_threshold: parseInt(document.getElementById('edit-item-low-stock').value)
  };

  await window.electronAPI.updateItem(itemId, updates);
  await loadItems();
  renderCategories();
  renderInventory();
  updateStats();
  
  editItemModal.style.display = 'none';
  editItemForm.reset();
};

// Add Item Form Submit
addItemForm.onsubmit = async (e) => {
  e.preventDefault();
  
  const newItem = {
    id: Date.now().toString(),
    name: document.getElementById('item-name').value,
    category_id: document.getElementById('item-category').value,
    subcategory_id: document.getElementById('item-subcategory').value || null,
    quantity: parseInt(document.getElementById('item-quantity').value),
    unit: document.getElementById('item-unit').value,
    low_stock_threshold: parseInt(document.getElementById('item-low-stock').value)
  };

  await window.electronAPI.addItem(newItem);
  await loadItems();
  renderCategories();
  renderInventory();
  updateStats();
  
  addItemModal.style.display = 'none';
  addItemForm.reset();
};

// Update Stats
async function updateStats() {
  const stats = await window.electronAPI.getStats();
  document.getElementById('total-items').textContent = stats.totalItems;
  document.getElementById('total-categories').textContent = stats.totalCategories;
  document.getElementById('low-stock').textContent = stats.lowStock;
}

// Populate Category Selects
function populateCategorySelects() {
  const selects = [
    document.getElementById('item-category'), 
    document.getElementById('edit-item-category'),
    filterCategory,
    subcategoryCategory
  ];
  
  selects.forEach((select, index) => {
    if (index === 2) { // filterCategory
      select.innerHTML = '<option value="all">All Categories</option>';
    } else {
      select.innerHTML = '';
    }
    
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      select.appendChild(option);
    });
  });
}

// Populate Subcategories for a Category
async function populateSubcategoriesForCategory(categorySelectId, subcategorySelectId) {
  const categorySelect = document.getElementById(categorySelectId);
  const subcategorySelect = document.getElementById(subcategorySelectId);
  const categoryId = categorySelect.value;

  subcategorySelect.innerHTML = '<option value="">None</option>';
  
  const categorySubcategories = subcategories.filter(s => s.category_id === categoryId);
  categorySubcategories.forEach(subcategory => {
    const option = document.createElement('option');
    option.value = subcategory.id;
    option.textContent = subcategory.name;
    subcategorySelect.appendChild(option);
  });
}

// Render Subcategories List
async function renderSubcategoriesList() {
  const categoryId = subcategoryCategory.value;
  const categorySubcategories = subcategories.filter(s => s.category_id === categoryId);

  if (categorySubcategories.length === 0) {
    subcategoriesList.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #a0a0a0; font-size: 9px;">
        No subcategories yet.<br>Add one below!
      </div>
    `;
    return;
  }

  subcategoriesList.innerHTML = '';
  categorySubcategories.forEach(subcategory => {
    const subcategoryItem = document.createElement('div');
    subcategoryItem.className = 'subcategory-item';
    subcategoryItem.innerHTML = `
      <div class="subcategory-name">${subcategory.name}</div>
      <div class="subcategory-actions">
        <button class="subcategory-btn delete" onclick="deleteSubcategory('${subcategory.id}')">Delete</button>
      </div>
    `;
    subcategoriesList.appendChild(subcategoryItem);
  });
}

// Delete Subcategory
window.deleteSubcategory = async function(subcategoryId) {
  if (confirm('Are you sure? Items using this subcategory will have it removed.')) {
    await window.electronAPI.deleteSubcategory(subcategoryId);
    await loadSubcategories();
    renderSubcategoriesList();
  }
};

// Add Subcategory Form Submit
addSubcategoryForm.onsubmit = async (e) => {
  e.preventDefault();
  
  const categoryId = subcategoryCategory.value;
  const name = document.getElementById('new-subcategory-name').value;

  await window.electronAPI.addSubcategory({
    category_id: categoryId,
    name: name
  });

  await loadSubcategories();
  renderSubcategoriesList();
  document.getElementById('new-subcategory-name').value = '';
};

// Event Listeners
addItemBtn.onclick = () => {
  addItemModal.style.display = 'block';
};

closeModal.onclick = () => {
  addItemModal.style.display = 'none';
};

cancelBtn.onclick = () => {
  addItemModal.style.display = 'none';
};

manageSubcategoriesBtn.onclick = () => {
  subcategoriesModal.style.display = 'block';
  renderSubcategoriesList();
};

closeSubcategories.onclick = () => {
  subcategoriesModal.style.display = 'none';
};

closeEdit.onclick = () => {
  editItemModal.style.display = 'none';
};

cancelEditBtn.onclick = () => {
  editItemModal.style.display = 'none';
};

window.onclick = (event) => {
  if (event.target === addItemModal) {
    addItemModal.style.display = 'none';
  }
  if (event.target === subcategoriesModal) {
    subcategoriesModal.style.display = 'none';
  }
  if (event.target === editItemModal) {
    editItemModal.style.display = 'none';
  }
  if (event.target === cloudSyncModal) {
    cloudSyncModal.style.display = 'none';
  }
};

searchInput.oninput = (e) => {
  searchQuery = e.target.value;
  renderInventory();
};

filterCategory.onchange = (e) => {
  currentFilter = e.target.value;
  renderCategories();
  renderInventory();
};

// Update subcategories when category changes in add form
document.getElementById('item-category').onchange = () => {
  populateSubcategoriesForCategory('item-category', 'item-subcategory');
};

// Update subcategories when category changes in edit form
document.getElementById('edit-item-category').onchange = () => {
  populateSubcategoriesForCategory('edit-item-category', 'edit-item-subcategory');
};

// Update subcategories list when category changes in subcategories modal
subcategoryCategory.onchange = () => {
  renderSubcategoriesList();
};

// Cloud Sync Functions
function showSyncMessage(message, type = 'info') {
  syncStatusMessage.textContent = message;
  syncStatusMessage.className = `sync-message ${type}`;
}

function setSyncStatus(status) {
  syncStatus.className = 'sync-status';
  if (status === 'syncing') {
    syncStatus.classList.add('syncing');
  } else if (status === 'synced') {
    syncStatus.classList.add('synced');
  } else if (status === 'error') {
    syncStatus.classList.add('error');
  }
}

async function testConnection() {
  showSyncMessage('Testing connection...', 'info');
  setSyncStatus('syncing');
  
  const result = await window.electronAPI.testCloudConnection();
  
  if (result.success) {
    showSyncMessage('✓ Connected to cloud successfully!', 'success');
    setSyncStatus('synced');
  } else {
    showSyncMessage(`✗ Connection failed: ${result.error}`, 'error');
    setSyncStatus('error');
  }
}

async function pushToCloud() {
  if (!confirm('This will overwrite all cloud data with your local data. Continue?')) {
    return;
  }
  
  showSyncMessage('Pushing data to cloud...', 'info');
  setSyncStatus('syncing');
  
  const result = await window.electronAPI.pushToCloud();
  
  if (result.success) {
    showSyncMessage('✓ Data pushed to cloud successfully!', 'success');
    setSyncStatus('synced');
  } else {
    showSyncMessage(`✗ Push failed: ${result.error}`, 'error');
    setSyncStatus('error');
  }
}

async function pullFromCloud() {
  if (!confirm('This will overwrite all local data with cloud data. Continue?')) {
    return;
  }
  
  showSyncMessage('Pulling data from cloud...', 'info');
  setSyncStatus('syncing');
  
  const result = await window.electronAPI.pullFromCloud();
  
  if (result.success) {
    showSyncMessage('✓ Data pulled from cloud successfully!', 'success');
    setSyncStatus('synced');
    
    // Reload all data
    await loadCategories();
    await loadSubcategories();
    await loadItems();
    renderCategories();
    renderInventory();
    updateStats();
  } else {
    showSyncMessage(`✗ Pull failed: ${result.error}`, 'error');
    setSyncStatus('error');
  }
}

// Cloud Sync Event Listeners
cloudSyncBtn.onclick = () => {
  cloudSyncModal.style.display = 'block';
  showSyncMessage('Ready to sync with cloud', 'info');
};

closeSync.onclick = () => {
  cloudSyncModal.style.display = 'none';
};

testConnectionBtn.onclick = testConnection;
pushToCloudBtn.onclick = pushToCloud;
pullFromCloudBtn.onclick = pullFromCloud;

syncStatus.onclick = () => {
  cloudSyncModal.style.display = 'block';
};

// Initialize on load
init();
