use crate::models::{Category, CloudItem, Subcategory};
use reqwest::blocking::Client;
use reqwest::Method;
use serde::de::DeserializeOwned;
use serde_json::Value;

#[derive(Clone)]
pub struct CloudSync {
    api_url: String,
    api_key: Option<String>,
    client: Client,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct CloudResponse {
    pub success: bool,
    pub message: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone)]
pub struct CloudData {
    pub subcategories: Vec<Subcategory>,
    pub items: Vec<CloudItem>,
}

impl CloudSync {
    pub fn new(api_url: String, api_key: Option<String>) -> Result<Self, String> {
        let client = Client::builder()
            .user_agent("PixelPantry")
            .build()
            .map_err(|err| err.to_string())?;
        Ok(Self {
            api_url: api_url.trim_end_matches('/').to_string(),
            api_key,
            client,
        })
    }

    pub fn test_connection(&self) -> CloudResponse {
        match self.request_value("/api/health", Method::GET, None) {
            Ok(_) => CloudResponse {
                success: true,
                message: Some("Connected to cloud".to_string()),
                error: None,
            },
            Err(error) => CloudResponse {
                success: false,
                message: None,
                error: Some(error),
            },
        }
    }

    pub fn push_to_cloud(
        &self,
        categories: &[Category],
        subcategories: &[Subcategory],
        items: &[CloudItem],
    ) -> CloudResponse {
        if let Err(error) = self.request_value("/api/clear", Method::POST, None) {
            return CloudResponse {
                success: false,
                message: None,
                error: Some(error),
            };
        }

        if let Err(error) = self.sync_collection("/api/categories", categories) {
            return CloudResponse {
                success: false,
                message: None,
                error: Some(error),
            };
        }

        if let Err(error) = self.sync_collection("/api/subcategories", subcategories) {
            return CloudResponse {
                success: false,
                message: None,
                error: Some(error),
            };
        }

        if let Err(error) = self.sync_collection("/api/items", items) {
            return CloudResponse {
                success: false,
                message: None,
                error: Some(error),
            };
        }

        CloudResponse {
            success: true,
            message: Some("Data pushed to cloud successfully".to_string()),
            error: None,
        }
    }

    pub fn pull_from_cloud(&self) -> Result<CloudData, String> {
        let _categories: Vec<Category> = self.request_collection("/api/categories")?;
        let subcategories: Vec<Subcategory> = self.request_collection("/api/subcategories")?;
        let items: Vec<CloudItem> = self.request_collection("/api/items")?;
        Ok(CloudData {
            subcategories,
            items,
        })
    }

    fn request_collection<T: DeserializeOwned>(&self, endpoint: &str) -> Result<Vec<T>, String> {
        let value = self.request_value(endpoint, Method::GET, None)?;
        let results = value.get("results").cloned().unwrap_or(Value::Array(vec![]));
        serde_json::from_value(results).map_err(|err| err.to_string())
    }

    fn sync_collection<T: serde::Serialize>(&self, endpoint: &str, values: &[T]) -> Result<(), String> {
        for value in values {
            let body = serde_json::to_value(value).map_err(|err| err.to_string())?;
            self.request_value(endpoint, Method::POST, Some(body))?;
        }
        Ok(())
    }

    fn request_value(
        &self,
        endpoint: &str,
        method: Method,
        data: Option<Value>,
    ) -> Result<Value, String> {
        let url = format!("{}{}", self.api_url, endpoint);
        let mut request = self.client.request(method, &url).header("Content-Type", "application/json");

        if let Some(key) = &self.api_key {
            request = request.header("X-API-Key", key);
        }

        if let Some(payload) = data {
            request = request.json(&payload);
        }

        let response = request.send().map_err(|err| err.to_string())?;
        let status = response.status();
        let text = response.text().map_err(|err| err.to_string())?;

        let parsed: Value = serde_json::from_str(&text).map_err(|_| format!("Failed to parse response: {}", text))?;
        if status.is_success() {
            Ok(parsed)
        } else {
            let message = parsed
                .get("error")
                .and_then(|value| value.as_str())
                .unwrap_or(&text)
                .to_string();
            Err(format!("HTTP {}: {}", status.as_u16(), message))
        }
    }
}
