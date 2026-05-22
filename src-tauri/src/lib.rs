use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use tauri::Manager;

mod cloud_sync;
mod config;
mod db;
mod models;

use cloud_sync::{CloudResponse, CloudSync};
use config::{
    effective_api_key, effective_api_url, load_config, merge_settings, save_config,
    settings_response, AppConfig, SettingsInput, SettingsResponse,
};
use db::PantryDatabase;
use models::{Category, CloudItem, Item, ItemInput, ItemUpdates, Stats, Subcategory, SubcategoryInput};

struct AppState {
    data_dir: PathBuf,
    db: Mutex<PantryDatabase>,
    config: Mutex<AppConfig>,
    sync_in_progress: Mutex<bool>,
}

#[tauri::command]
fn get_categories(state: tauri::State<'_, AppState>) -> Result<Vec<Category>, String> {
    let db = state.db.lock().map_err(|_| "Database lock failed".to_string())?;
    db.get_all_categories()
}

#[tauri::command]
fn get_subcategories(
    state: tauri::State<'_, AppState>,
    category_id: Option<String>,
) -> Result<Vec<Subcategory>, String> {
    let db = state.db.lock().map_err(|_| "Database lock failed".to_string())?;
    if let Some(category_id) = category_id {
        db.get_subcategories_by_category(&category_id)
    } else {
        db.get_all_subcategories()
    }
}

#[tauri::command]
fn add_subcategory(
    state: tauri::State<'_, AppState>,
    data: SubcategoryInput,
) -> Result<serde_json::Value, String> {
    let id = generate_id();
    let db = state.db.lock().map_err(|_| "Database lock failed".to_string())?;
    db.add_subcategory(&id, &data.name, &data.category_id)?;
    Ok(serde_json::json!({ "success": true, "id": id }))
}

#[tauri::command]
fn update_subcategory(
    state: tauri::State<'_, AppState>,
    id: String,
    name: String,
) -> Result<serde_json::Value, String> {
    let db = state.db.lock().map_err(|_| "Database lock failed".to_string())?;
    db.update_subcategory(&id, &name)?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
fn delete_subcategory(
    state: tauri::State<'_, AppState>,
    id: String,
) -> Result<serde_json::Value, String> {
    let db = state.db.lock().map_err(|_| "Database lock failed".to_string())?;
    db.delete_subcategory(&id)?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
fn get_items(state: tauri::State<'_, AppState>) -> Result<Vec<Item>, String> {
    let db = state.db.lock().map_err(|_| "Database lock failed".to_string())?;
    db.get_all_items()
}

#[tauri::command]
fn add_item(
    state: tauri::State<'_, AppState>,
    item: ItemInput,
) -> Result<serde_json::Value, String> {
    let db = state.db.lock().map_err(|_| "Database lock failed".to_string())?;
    db.add_item(&item)?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
fn update_item(
    state: tauri::State<'_, AppState>,
    id: String,
    updates: ItemUpdates,
) -> Result<serde_json::Value, String> {
    let db = state.db.lock().map_err(|_| "Database lock failed".to_string())?;
    db.update_item(&id, &updates)?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
fn delete_item(
    state: tauri::State<'_, AppState>,
    id: String,
) -> Result<serde_json::Value, String> {
    let db = state.db.lock().map_err(|_| "Database lock failed".to_string())?;
    db.delete_item(&id)?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
fn get_stats(state: tauri::State<'_, AppState>) -> Result<Stats, String> {
    let db = state.db.lock().map_err(|_| "Database lock failed".to_string())?;
    db.get_stats()
}

#[tauri::command]
fn get_settings(state: tauri::State<'_, AppState>) -> Result<SettingsResponse, String> {
    let config = state
        .config
        .lock()
        .map_err(|_| "Config lock failed".to_string())?;
    Ok(settings_response(&config))
}

#[tauri::command]
fn save_settings(
    state: tauri::State<'_, AppState>,
    settings: SettingsInput,
) -> Result<bool, String> {
    let mut config = state
        .config
        .lock()
        .map_err(|_| "Config lock failed".to_string())?;
    let merged = merge_settings(&config, &settings);
    save_config(&state.data_dir, &merged)?;
    *config = merged;
    Ok(true)
}

#[tauri::command]
fn test_cloud_connection(state: tauri::State<'_, AppState>) -> Result<CloudResponse, String> {
    let config = state
        .config
        .lock()
        .map_err(|_| "Config lock failed".to_string())?;
    let cloud = CloudSync::new(effective_api_url(&config), effective_api_key(&config))?;
    Ok(cloud.test_connection())
}

#[tauri::command]
fn push_to_cloud(state: tauri::State<'_, AppState>) -> Result<CloudResponse, String> {
    if let Some(response) = start_sync(&state) {
        return Ok(response);
    }

    let result = (|| {
        let config = state
            .config
            .lock()
            .map_err(|_| "Config lock failed".to_string())?;
        let cloud = CloudSync::new(effective_api_url(&config), effective_api_key(&config))?;
        drop(config);

        let db = state.db.lock().map_err(|_| "Database lock failed".to_string())?;
        let categories = db.get_all_categories()?;
        let subcategories = db.get_all_subcategories()?;
        let items = db
            .get_all_items()?
            .into_iter()
            .map(|item| CloudItem {
                id: item.id,
                name: item.name,
                category_id: item.category_id,
                subcategory_id: item.subcategory_id,
                quantity: item.quantity,
                unit: item.unit,
                low_stock_threshold: item.low_stock_threshold,
                created_at: Some(item.created_at),
            })
            .collect::<Vec<_>>();

        Ok(cloud.push_to_cloud(&categories, &subcategories, &items))
    })();

    finish_sync(&state);
    result
}

#[tauri::command]
fn pull_from_cloud(state: tauri::State<'_, AppState>) -> Result<CloudResponse, String> {
    if let Some(response) = start_sync(&state) {
        return Ok(response);
    }

    let result = (|| {
        let config = state
            .config
            .lock()
            .map_err(|_| "Config lock failed".to_string())?;
        let cloud = CloudSync::new(effective_api_url(&config), effective_api_key(&config))?;
        drop(config);

        let data = cloud.pull_from_cloud()?;
        let _ = data.categories.len();
        let subcategories = data.subcategories;
        let items = data.items;
        let db = state.db.lock().map_err(|_| "Database lock failed".to_string())?;
        db.clear_items_and_subcategories()?;

        for subcategory in subcategories {
            db.add_subcategory(&subcategory.id, &subcategory.name, &subcategory.category_id)?;
        }

        for item in items {
            let input = ItemInput {
                id: item.id,
                name: item.name,
                category_id: item.category_id,
                subcategory_id: item.subcategory_id,
                quantity: item.quantity,
                unit: item.unit,
                low_stock_threshold: item.low_stock_threshold.unwrap_or(3),
            };
            db.add_item(&input)?;
        }

        Ok(CloudResponse {
            success: true,
            message: Some("Data pulled and imported successfully".to_string()),
            error: None,
        })
    })();

    finish_sync(&state);
    result
}

fn start_sync(state: &tauri::State<'_, AppState>) -> Option<CloudResponse> {
    let mut in_progress = match state.sync_in_progress.lock() {
        Ok(guard) => guard,
        Err(_) => {
            return Some(CloudResponse {
                success: false,
                message: None,
                error: Some("Sync lock failed".to_string()),
            })
        }
    };

    if *in_progress {
        return Some(CloudResponse {
            success: false,
            message: None,
            error: Some("Sync already in progress".to_string()),
        });
    }

    *in_progress = true;
    None
}

fn finish_sync(state: &tauri::State<'_, AppState>) {
    if let Ok(mut guard) = state.sync_in_progress.lock() {
        *guard = false;
    }
}

fn generate_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    millis.to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if cfg!(debug_assertions) {
        dotenvy::dotenv().ok();
    }

    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|err| std::io::Error::new(std::io::ErrorKind::Other, err))?;
            fs::create_dir_all(&data_dir)?;

            let db_path = data_dir.join("pantry.db");
            let db = PantryDatabase::new(db_path)
                .map_err(|err| std::io::Error::new(std::io::ErrorKind::Other, err))?;
            let config = load_config(&data_dir);

            app.manage(AppState {
                data_dir,
                db: Mutex::new(db),
                config: Mutex::new(config),
                sync_in_progress: Mutex::new(false),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_categories,
            get_subcategories,
            add_subcategory,
            update_subcategory,
            delete_subcategory,
            get_items,
            add_item,
            update_item,
            delete_item,
            get_stats,
            get_settings,
            save_settings,
            test_cloud_connection,
            push_to_cloud,
            pull_from_cloud,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
