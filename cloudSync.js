const https = require('https');

class CloudSync {
  constructor(apiUrl = 'https://pixelpantry.alfelfriki.tech') {
    this.apiUrl = apiUrl;
    this.syncInProgress = false;
  }

  // Make HTTP request
  async request(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.apiUrl);
      
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      if (data) {
        const body = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(body);
      }

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${parsed.error || responseData}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${responseData}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  // Sync categories to cloud
  async syncCategoriesToCloud(categories) {
    try {
      for (const category of categories) {
        await this.request('/api/categories', 'POST', category);
      }
      return { success: true };
    } catch (error) {
      console.error('Error syncing categories:', error);
      return { success: false, error: error.message };
    }
  }

  // Sync subcategories to cloud
  async syncSubcategoriesToCloud(subcategories) {
    try {
      for (const subcategory of subcategories) {
        await this.request('/api/subcategories', 'POST', subcategory);
      }
      return { success: true };
    } catch (error) {
      console.error('Error syncing subcategories:', error);
      return { success: false, error: error.message };
    }
  }

  // Sync items to cloud
  async syncItemsToCloud(items) {
    try {
      for (const item of items) {
        await this.request('/api/items', 'POST', {
          id: item.id,
          name: item.name,
          category_id: item.category_id,
          subcategory_id: item.subcategory_id,
          quantity: item.quantity,
          unit: item.unit,
          low_stock_threshold: item.low_stock_threshold,
          created_at: item.created_at
        });
      }
      return { success: true };
    } catch (error) {
      console.error('Error syncing items:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all data from cloud
  async getCloudData() {
    try {
      const [categories, subcategories, items] = await Promise.all([
        this.request('/api/categories', 'GET'),
        this.request('/api/subcategories', 'GET'),
        this.request('/api/items', 'GET')
      ]);

      return {
        success: true,
        data: {
          categories: categories.results || [],
          subcategories: subcategories.results || [],
          items: items.results || []
        }
      };
    } catch (error) {
      console.error('Error getting cloud data:', error);
      return { success: false, error: error.message };
    }
  }

  // Push local data to cloud
  async pushToCloud(localData) {
    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.syncInProgress = true;

    try {
      // Clear cloud data first
      await this.request('/api/clear', 'POST');

      // Push categories
      const categoriesResult = await this.syncCategoriesToCloud(localData.categories);
      if (!categoriesResult.success) {
        throw new Error('Failed to sync categories');
      }

      // Push subcategories
      const subcategoriesResult = await this.syncSubcategoriesToCloud(localData.subcategories);
      if (!subcategoriesResult.success) {
        throw new Error('Failed to sync subcategories');
      }

      // Push items
      const itemsResult = await this.syncItemsToCloud(localData.items);
      if (!itemsResult.success) {
        throw new Error('Failed to sync items');
      }

      this.syncInProgress = false;
      return { success: true, message: 'Data pushed to cloud successfully' };
    } catch (error) {
      this.syncInProgress = false;
      console.error('Error pushing to cloud:', error);
      return { success: false, error: error.message };
    }
  }

  // Pull data from cloud to local
  async pullFromCloud() {
    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.syncInProgress = true;

    try {
      const result = await this.getCloudData();
      this.syncInProgress = false;

      if (result.success) {
        return {
          success: true,
          data: result.data,
          message: 'Data pulled from cloud successfully'
        };
      } else {
        return result;
      }
    } catch (error) {
      this.syncInProgress = false;
      console.error('Error pulling from cloud:', error);
      return { success: false, error: error.message };
    }
  }

  // Test connection
  async testConnection() {
    try {
      await this.request('/api/health', 'GET');
      return { success: true, message: 'Connected to cloud' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = CloudSync;
