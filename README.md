# PixelPantry 🎮

A gamified pixel-art pantry inventory tracker built with Tauri and Rust.

## Features

- **Pixel-Art Interface**: Retro gaming aesthetic with pixel-perfect styling
- **Category Management**: Organize items by 5 main categories:
  - Fresh
  - Frozen
  - Dry
  - Spices
  - Beverages
- **Custom Subcategories**: Create your own subcategories within each main category
- **Inventory Tracking**: Add, remove, and count items in real-time
- **Custom Low Stock Alerts**: Set individual low stock thresholds for each item
- **Visual Stock Indicators**: Color-coded items based on stock levels
  - Green: Good stock
  - Orange: Low stock (at or below custom threshold)
  - Red: Out of stock
  - Pulsing animation for low stock alerts
- **Search & Filter**: Quickly find items by name or category
- **SQLite Database**: Persistent local storage with proper relational data
- **Cloud Sync**: Sync your data with Cloudflare D1 database
  - Push local data to cloud
  - Pull cloud data to local
  - Test connection to cloud
- **Item Editing**: Modify item details, categories, subcategories, and thresholds
- **Real-time Stats**: Track total items, categories, and low stock alerts

## Installation

1. Install dependencies:
```bash
npm install
```

2. Ensure you have the Rust toolchain and Tauri system prerequisites installed.

3. Set up your API key for cloud sync (optional for development):
```bash
cp .env.example .env
# Edit .env and add your Cloudflare API key
```

## Usage

Run the application in development mode:
```bash
npm run dev
```

Or run with the start alias:
```bash
npm start
```

## Building Releases

Build installers for all platforms:
```bash
npm run build
```

Built installers will be in `src-tauri/target/release/bundle/`.

### Automated Releases

When you push a git tag starting with `v` (e.g., `v1.0.0`), GitHub Actions will automatically:
- Build installers for Windows, macOS, and Linux
- Create a GitHub release with all installers attached

To create a release:
```bash
git tag v1.0.0
git push origin v1.0.0
```

## How to Use

1. **Add Items**: Click the "+ Add Item" button to add new pantry items
   - Choose a category and optionally a subcategory
   - Set the quantity and unit
   - Set a custom low stock threshold (default: 3)
2. **Manage Subcategories**: Click "Manage Subcategories" in the sidebar
   - Select a category to view its subcategories
   - Add new subcategories to organize items better
   - Delete subcategories you no longer need
3. **Update Quantity**: Use + and - buttons on each item card
4. **Edit Items**: Click the "Edit" button to modify item details
5. **Delete Items**: Click the × button to remove items
6. **Filter by Category**: Click categories in the sidebar or use the dropdown
7. **Search**: Type in the search box to find specific items
8. **Monitor Stock**: Check the stats bar for low stock alerts
9. **Cloud Sync**: Click the ☁ Sync button to:
   - Test connection to your Cloudflare D1 database
   - Push local data to the cloud (overwrites cloud)
   - Pull cloud data to local (overwrites local)

## Project Structure

```
PixelPantry/
├── web/              # Frontend assets
│   ├── index.html    # Application UI
│   ├── styles.css    # Pixel-art styling
│   └── renderer.js   # Frontend logic
├── src-tauri/        # Tauri (Rust) backend
├── package.json      # Dependencies
├── assets/           # Icons and images
└── README.md         # Documentation
```

## Data Storage

Application data is stored in a SQLite database in your system's Tauri app data directory:
- **macOS**: `~/Library/Application Support/com.pixelpantry.app/pantry.db`
- **Windows**: `%APPDATA%/com.pixelpantry.app/pantry.db`
- **Linux**: `~/.local/share/com.pixelpantry.app/pantry.db`

The database includes three main tables:
- **categories**: Main category definitions
- **subcategories**: User-created subcategories
- **items**: Inventory items with relationships

## Cloud Sync

PixelPantry can sync with a Cloudflare D1 database via REST API:

- **Endpoint**: `https://pixelpantry.alfelfriki.tech`
- **Authentication**: API key required (set in Settings or via `.env` in development)
- **Push**: Uploads local data to cloud (overwrites cloud data)
- **Pull**: Downloads cloud data to local (overwrites local data)
- **Connection Test**: Verifies cloud API is accessible

### Setting up Cloud Sync

1. Get your API key from the Cloudflare worker deployment
2. (Optional for development) Create a `.env` file in the app directory:
   ```env
   PIXELPANTRY_API_KEY=your-api-key-here
   PIXELPANTRY_API_URL=https://pixelpantry.alfelfriki.tech
   ```
3. Restart the app to load the API key
4. Or enter the API key in Settings to save it to your local config
5. Click ☁ Sync to test connection and sync data

### Security

- All sync operations require API key authentication
- API key stored locally in the app config file (not committed to git)
- HTTPS encryption for all data transfers
- Only you can access your data with your unique API key

Your cloud endpoint should implement these REST endpoints:
- `GET /api/health` - Health check
- `GET /api/categories` - Get all categories
- `GET /api/subcategories` - Get all subcategories
- `GET /api/items` - Get all items
- `POST /api/categories` - Create/update category
- `POST /api/subcategories` - Create/update subcategory
- `POST /api/items` - Create/update item
- `POST /api/clear` - Clear all data

## Default Categories

- Fresh (Green)
- Frozen (Blue)
- Dry (Orange)
- Spices (Brown)
- Beverages (Purple)

## Technologies

- Tauri 2
- Rust + rusqlite (SQLite database)
- Vanilla JavaScript
- CSS3 (Pixel-art styling)
- Google Fonts (Press Start 2P)

## License

MIT
