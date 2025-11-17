const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

class PantryDatabase {
  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'pantry.db');
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  initializeDatabase() {
    // Create categories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        sort_order INTEGER
      )
    `);

    // Create subcategories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS subcategories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category_id TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `);

    // Create items table with low_stock_threshold
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category_id TEXT NOT NULL,
        subcategory_id TEXT,
        quantity INTEGER NOT NULL DEFAULT 0,
        unit TEXT,
        low_stock_threshold INTEGER DEFAULT 3,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL
      )
    `);

    // Initialize default categories if empty
    const categoryCount = this.db.prepare('SELECT COUNT(*) as count FROM categories').get();
    if (categoryCount.count === 0) {
      const defaultCategories = [
        { id: 'fresh', name: 'Fresh', color: '#4CAF50', sort_order: 1 },
        { id: 'frozen', name: 'Frozen', color: '#2196F3', sort_order: 2 },
        { id: 'dry', name: 'Dry', color: '#FF9800', sort_order: 3 },
        { id: 'spices', name: 'Spices', color: '#D2691E', sort_order: 4 },
        { id: 'beverages', name: 'Beverages', color: '#9C27B0', sort_order: 5 }
      ];

      const insertCategory = this.db.prepare(
        'INSERT INTO categories (id, name, color, sort_order) VALUES (?, ?, ?, ?)'
      );

      const insertMany = this.db.transaction((categories) => {
        for (const cat of categories) {
          insertCategory.run(cat.id, cat.name, cat.color, cat.sort_order);
        }
      });

      insertMany(defaultCategories);
    }
  }

  // Categories
  getAllCategories() {
    return this.db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  }

  // Subcategories
  getAllSubcategories() {
    return this.db.prepare('SELECT * FROM subcategories ORDER BY name').all();
  }

  getSubcategoriesByCategory(categoryId) {
    return this.db.prepare('SELECT * FROM subcategories WHERE category_id = ? ORDER BY name')
      .all(categoryId);
  }

  addSubcategory(id, name, categoryId) {
    return this.db.prepare('INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)')
      .run(id, name, categoryId);
  }

  updateSubcategory(id, name) {
    return this.db.prepare('UPDATE subcategories SET name = ? WHERE id = ?')
      .run(name, id);
  }

  deleteSubcategory(id) {
    return this.db.prepare('DELETE FROM subcategories WHERE id = ?').run(id);
  }

  // Items
  getAllItems() {
    return this.db.prepare(`
      SELECT 
        i.*,
        c.name as category_name,
        c.color as category_color,
        s.name as subcategory_name
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN subcategories s ON i.subcategory_id = s.id
      ORDER BY i.name
    `).all();
  }

  getItemById(id) {
    return this.db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  }

  addItem(item) {
    return this.db.prepare(`
      INSERT INTO items (id, name, category_id, subcategory_id, quantity, unit, low_stock_threshold, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      item.id,
      item.name,
      item.category_id,
      item.subcategory_id || null,
      item.quantity,
      item.unit || null,
      item.low_stock_threshold || 3,
      Date.now()
    );
  }

  updateItem(id, updates) {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.category_id !== undefined) {
      fields.push('category_id = ?');
      values.push(updates.category_id);
    }
    if (updates.subcategory_id !== undefined) {
      fields.push('subcategory_id = ?');
      values.push(updates.subcategory_id || null);
    }
    if (updates.quantity !== undefined) {
      fields.push('quantity = ?');
      values.push(updates.quantity);
    }
    if (updates.unit !== undefined) {
      fields.push('unit = ?');
      values.push(updates.unit);
    }
    if (updates.low_stock_threshold !== undefined) {
      fields.push('low_stock_threshold = ?');
      values.push(updates.low_stock_threshold);
    }

    values.push(id);

    return this.db.prepare(`UPDATE items SET ${fields.join(', ')} WHERE id = ?`)
      .run(...values);
  }

  deleteItem(id) {
    return this.db.prepare('DELETE FROM items WHERE id = ?').run(id);
  }

  // Stats
  getStats() {
    const totalItems = this.db.prepare('SELECT COUNT(*) as count FROM items').get();
    const totalCategories = this.db.prepare('SELECT COUNT(*) as count FROM categories').get();
    const lowStock = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM items 
      WHERE quantity > 0 AND quantity <= low_stock_threshold
    `).get();
    const outOfStock = this.db.prepare('SELECT COUNT(*) as count FROM items WHERE quantity = 0').get();

    return {
      totalItems: totalItems.count,
      totalCategories: totalCategories.count,
      lowStock: lowStock.count,
      outOfStock: outOfStock.count
    };
  }

  close() {
    this.db.close();
  }
}

module.exports = PantryDatabase;
