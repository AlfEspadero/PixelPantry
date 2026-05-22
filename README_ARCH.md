# Arch Linux Installation Guide

We have made it easy to install PixelPantry on Arch Linux using the Tauri AppImage bundle.

## Build the AppImage

1.  **Build:**
    ```bash
    npm run build
    ```

2.  **Run the AppImage:**
    ```bash
    chmod +x src-tauri/target/release/bundle/appimage/PixelPantry_1.0.1_amd64.AppImage
    ./src-tauri/target/release/bundle/appimage/PixelPantry_1.0.1_amd64.AppImage
    ```

*(Note: The version number in the filename may vary.)*
