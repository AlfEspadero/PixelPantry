use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub color: String,
    pub sort_order: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subcategory {
    pub id: String,
    pub name: String,
    pub category_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Item {
    pub id: String,
    pub name: String,
    pub category_id: String,
    pub subcategory_id: Option<String>,
    pub quantity: i64,
    pub unit: Option<String>,
    pub low_stock_threshold: Option<i64>,
    pub created_at: i64,
    pub category_name: Option<String>,
    pub category_color: Option<String>,
    pub subcategory_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemInput {
    pub id: String,
    pub name: String,
    pub category_id: String,
    pub subcategory_id: Option<String>,
    pub quantity: i64,
    pub unit: Option<String>,
    pub low_stock_threshold: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemUpdates {
    pub name: Option<String>,
    pub category_id: Option<String>,
    pub subcategory_id: Option<String>,
    pub quantity: Option<i64>,
    pub unit: Option<String>,
    pub low_stock_threshold: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stats {
    #[serde(rename = "totalItems")]
    pub total_items: i64,
    #[serde(rename = "totalCategories")]
    pub total_categories: i64,
    #[serde(rename = "lowStock")]
    pub low_stock: i64,
    #[serde(rename = "outOfStock")]
    pub out_of_stock: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubcategoryInput {
    pub name: String,
    pub category_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudItem {
    pub id: String,
    pub name: String,
    pub category_id: String,
    pub subcategory_id: Option<String>,
    pub quantity: i64,
    pub unit: Option<String>,
    pub low_stock_threshold: Option<i64>,
    pub created_at: Option<i64>,
}
