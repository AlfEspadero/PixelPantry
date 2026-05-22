use serde::{Deserialize, Serialize};
use std::{env, fs, path::Path};

pub const DEFAULT_API_URL: &str = "https://pixelpantry.alfelfriki.tech";

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(rename = "apiKey")]
    pub api_key: Option<String>,
    #[serde(rename = "apiUrl")]
    pub api_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsInput {
    #[serde(rename = "apiKey")]
    pub api_key: Option<String>,
    #[serde(rename = "apiUrl")]
    pub api_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsResponse {
    #[serde(rename = "apiKey")]
    pub api_key: String,
    #[serde(rename = "apiUrl")]
    pub api_url: String,
}

pub fn load_config(data_dir: &Path) -> AppConfig {
    let path = data_dir.join("config.json");
    if let Ok(contents) = fs::read_to_string(path) {
        serde_json::from_str(&contents).unwrap_or_default()
    } else {
        AppConfig::default()
    }
}

pub fn save_config(data_dir: &Path, config: &AppConfig) -> Result<(), String> {
    let path = data_dir.join("config.json");
    let contents = serde_json::to_string_pretty(config).map_err(|err| err.to_string())?;
    fs::write(path, contents).map_err(|err| err.to_string())
}

pub fn merge_settings(existing: &AppConfig, input: &SettingsInput) -> AppConfig {
    AppConfig {
        api_key: input
            .api_key
            .clone()
            .or_else(|| existing.api_key.clone()),
        api_url: input
            .api_url
            .clone()
            .or_else(|| existing.api_url.clone()),
    }
}

pub fn effective_api_key(config: &AppConfig) -> Option<String> {
    non_empty(config.api_key.clone()).or_else(|| env::var("PIXELPANTRY_API_KEY").ok())
}

pub fn effective_api_url(config: &AppConfig) -> String {
    non_empty(config.api_url.clone())
        .or_else(|| env::var("PIXELPANTRY_API_URL").ok())
        .unwrap_or_else(|| DEFAULT_API_URL.to_string())
}

pub fn settings_response(config: &AppConfig) -> SettingsResponse {
    SettingsResponse {
        api_key: effective_api_key(config).unwrap_or_default(),
        api_url: effective_api_url(config),
    }
}

fn non_empty(value: Option<String>) -> Option<String> {
    value.and_then(|val| {
        if val.trim().is_empty() {
            None
        } else {
            Some(val)
        }
    })
}
