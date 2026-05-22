use crate::models::{Category, Item, ItemInput, ItemUpdates, Stats, Subcategory};
use rusqlite::{params, params_from_iter, Connection};
use rusqlite::types::Value;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct PantryDatabase {
    conn: Connection,
}

impl PantryDatabase {
    pub fn new<P: AsRef<Path>>(db_path: P) -> Result<Self, String> {
        let conn = Connection::open(db_path).map_err(|err| err.to_string())?;
        let mut db = Self { conn };
        db.initialize_database()?;
        Ok(db)
    }

    fn initialize_database(&mut self) -> Result<(), String> {
        self.conn
            .execute_batch(
                "
                CREATE TABLE IF NOT EXISTS categories (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    color TEXT NOT NULL,
                    sort_order INTEGER
                );
                CREATE TABLE IF NOT EXISTS subcategories (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    category_id TEXT NOT NULL,
                    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
                );
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
                );
                ",
            )
            .map_err(|err| err.to_string())?;

        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM categories", [], |row| row.get(0))
            .map_err(|err| err.to_string())?;

        if count == 0 {
            let defaults = vec![
                ("fresh", "Fresh", "#4CAF50", 1),
                ("frozen", "Frozen", "#2196F3", 2),
                ("dry", "Dry", "#FF9800", 3),
                ("spices", "Spices", "#D2691E", 4),
                ("beverages", "Beverages", "#9C27B0", 5),
            ];
            let tx = self.conn.transaction().map_err(|err| err.to_string())?;
            {
                let mut stmt = tx
                    .prepare(
                        "INSERT INTO categories (id, name, color, sort_order) VALUES (?, ?, ?, ?)",
                    )
                    .map_err(|err| err.to_string())?;
                for (id, name, color, sort_order) in defaults {
                    stmt.execute(params![id, name, color, sort_order])
                        .map_err(|err| err.to_string())?;
                }
            }
            tx.commit().map_err(|err| err.to_string())?;
        }

        Ok(())
    }

    pub fn get_all_categories(&self) -> Result<Vec<Category>, String> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, color, sort_order FROM categories ORDER BY sort_order")
            .map_err(|err| err.to_string())?;
        let categories = stmt
            .query_map([], |row| {
                Ok(Category {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                    sort_order: row.get(3)?,
                })
            })
            .map_err(|err| err.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|err| err.to_string())?;
        Ok(categories)
    }

    pub fn get_all_subcategories(&self) -> Result<Vec<Subcategory>, String> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, category_id FROM subcategories ORDER BY name")
            .map_err(|err| err.to_string())?;
        let subcategories = stmt
            .query_map([], |row| {
                Ok(Subcategory {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    category_id: row.get(2)?,
                })
            })
            .map_err(|err| err.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|err| err.to_string())?;
        Ok(subcategories)
    }

    pub fn get_subcategories_by_category(&self, category_id: &str) -> Result<Vec<Subcategory>, String> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, category_id FROM subcategories WHERE category_id = ? ORDER BY name")
            .map_err(|err| err.to_string())?;
        let subcategories = stmt
            .query_map([category_id], |row| {
                Ok(Subcategory {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    category_id: row.get(2)?,
                })
            })
            .map_err(|err| err.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|err| err.to_string())?;
        Ok(subcategories)
    }

    pub fn add_subcategory(&self, id: &str, name: &str, category_id: &str) -> Result<(), String> {
        self.conn
            .execute(
                "INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)",
                params![id, name, category_id],
            )
            .map_err(|err| err.to_string())?;
        Ok(())
    }

    pub fn update_subcategory(&self, id: &str, name: &str) -> Result<(), String> {
        self.conn
            .execute(
                "UPDATE subcategories SET name = ? WHERE id = ?",
                params![name, id],
            )
            .map_err(|err| err.to_string())?;
        Ok(())
    }

    pub fn delete_subcategory(&self, id: &str) -> Result<(), String> {
        self.conn
            .execute("DELETE FROM subcategories WHERE id = ?", params![id])
            .map_err(|err| err.to_string())?;
        Ok(())
    }

    pub fn get_all_items(&self) -> Result<Vec<Item>, String> {
        let mut stmt = self
            .conn
            .prepare(
                "
                SELECT
                    i.id,
                    i.name,
                    i.category_id,
                    i.subcategory_id,
                    i.quantity,
                    i.unit,
                    i.low_stock_threshold,
                    i.created_at,
                    c.name as category_name,
                    c.color as category_color,
                    s.name as subcategory_name
                FROM items i
                LEFT JOIN categories c ON i.category_id = c.id
                LEFT JOIN subcategories s ON i.subcategory_id = s.id
                ORDER BY i.name
                ",
            )
            .map_err(|err| err.to_string())?;
        let items = stmt
            .query_map([], |row| {
                Ok(Item {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    category_id: row.get(2)?,
                    subcategory_id: row.get(3)?,
                    quantity: row.get(4)?,
                    unit: row.get(5)?,
                    low_stock_threshold: row.get(6)?,
                    created_at: row.get(7)?,
                    category_name: row.get(8)?,
                    category_color: row.get(9)?,
                    subcategory_name: row.get(10)?,
                })
            })
            .map_err(|err| err.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|err| err.to_string())?;
        Ok(items)
    }

    pub fn add_item(&self, item: &ItemInput) -> Result<(), String> {
        let created_at = current_time_millis();
        let unit = match item.unit.as_ref() {
            Some(unit) if unit.is_empty() => None,
            Some(unit) => Some(unit.as_str()),
            None => None,
        };
        self.conn
            .execute(
                "INSERT INTO items (id, name, category_id, subcategory_id, quantity, unit, low_stock_threshold, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                params![
                    item.id,
                    item.name,
                    item.category_id,
                    item.subcategory_id,
                    item.quantity,
                    unit,
                    item.low_stock_threshold,
                    created_at
                ],
            )
            .map_err(|err| err.to_string())?;
        Ok(())
    }

    pub fn update_item(&self, id: &str, updates: &ItemUpdates) -> Result<(), String> {
        let mut fields = Vec::new();
        let mut values: Vec<Value> = Vec::new();

        if let Some(name) = &updates.name {
            fields.push("name = ?");
            values.push(Value::from(name.clone()));
        }
        if let Some(category_id) = &updates.category_id {
            fields.push("category_id = ?");
            values.push(Value::from(category_id.clone()));
        }
        if updates.subcategory_id.is_some() {
            fields.push("subcategory_id = ?");
            let value = updates
                .subcategory_id
                .as_ref()
                .map(|id| Value::from(id.clone()))
                .unwrap_or(Value::Null);
            values.push(value);
        }
        if let Some(quantity) = updates.quantity {
            fields.push("quantity = ?");
            values.push(Value::from(quantity));
        }
        if updates.unit.is_some() {
            fields.push("unit = ?");
            let value = updates
                .unit
                .as_ref()
                .map(|unit| Value::from(unit.clone()))
                .unwrap_or(Value::Null);
            values.push(value);
        }
        if let Some(threshold) = updates.low_stock_threshold {
            fields.push("low_stock_threshold = ?");
            values.push(Value::from(threshold));
        }

        if fields.is_empty() {
            return Ok(());
        }

        values.push(Value::from(id.to_string()));
        let sql = format!("UPDATE items SET {} WHERE id = ?", fields.join(", "));
        self.conn
            .execute(&sql, params_from_iter(values))
            .map_err(|err| err.to_string())?;
        Ok(())
    }

    pub fn delete_item(&self, id: &str) -> Result<(), String> {
        self.conn
            .execute("DELETE FROM items WHERE id = ?", params![id])
            .map_err(|err| err.to_string())?;
        Ok(())
    }

    pub fn clear_items_and_subcategories(&self) -> Result<(), String> {
        self.conn
            .execute_batch("DELETE FROM items; DELETE FROM subcategories;")
            .map_err(|err| err.to_string())?;
        Ok(())
    }

    pub fn get_stats(&self) -> Result<Stats, String> {
        let total_items: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM items", [], |row| row.get(0))
            .map_err(|err| err.to_string())?;
        let total_categories: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM categories", [], |row| row.get(0))
            .map_err(|err| err.to_string())?;
        let low_stock: i64 = self
            .conn
            .query_row(
                "SELECT COUNT(*) FROM items WHERE quantity > 0 AND quantity <= low_stock_threshold",
                [],
                |row| row.get(0),
            )
            .map_err(|err| err.to_string())?;
        let out_of_stock: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM items WHERE quantity = 0", [], |row| row.get(0))
            .map_err(|err| err.to_string())?;

        Ok(Stats {
            total_items,
            total_categories,
            low_stock,
            out_of_stock,
        })
    }
}

fn current_time_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}
