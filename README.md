# PixelPantry 🎮

A gamified pixel-art pantry inventory tracker built with Electron.

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
- **Item Editing**: Modify item details, categories, subcategories, and thresholds
- **Real-time Stats**: Track total items, categories, and low stock alerts

## Installation

1. Install dependencies:
```bash
npm install
```

## Usage

Run the application in development mode:
```bash
npm run dev
```

Or run without DevTools:
```bash
npm start
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

## Project Structure

```
PixelPantry/
├── main.js           # Electron main process
├── preload.js        # Preload script for IPC
├── database.js       # SQLite database layer
├── index.html        # Application UI
├── styles.css        # Pixel-art styling
├── renderer.js       # Frontend logic
├── package.json      # Dependencies
├── assets/           # Icons and images
└── README.md         # Documentation
```

## Data Storage

Application data is stored in a SQLite database in your system's user data directory:
- **macOS**: `~/Library/Application Support/pixelpantry/pantry.db`
- **Windows**: `%APPDATA%/pixelpantry/pantry.db`
- **Linux**: `~/.config/pixelpantry/pantry.db`

The database includes three main tables:
- **categories**: Main category definitions
- **subcategories**: User-created subcategories
- **items**: Inventory items with relationships

## Default Categories

- Fresh (Green)
- Frozen (Blue)
- Dry (Orange)
- Spices (Brown)
- Beverages (Purple)

## Technologies

- Electron 28
- better-sqlite3 (SQLite database)
- Vanilla JavaScript
- CSS3 (Pixel-art styling)
- Google Fonts (Press Start 2P)

## License

MIT
