# Arch Linux Installation Guide

We have made it easy to install PixelPantry on Arch Linux. You have two main options:

## Option 1: Generate a Pacman Package (Recommended for local dev)

We have configured the project to generate a native Arch Linux package (`.pkg.tar.zst`) automatically.

1.  **Build the package:**
    ```bash
    npm run build:linux
    ```

2.  **Install the package:**
    Go to the `dist` folder and use `pacman` to install the generated file.
    ```bash
    sudo pacman -U dist/pixelpantry-1.0.1.pacman
    ```
    *(Note: The version number in the filename may vary)*

## Option 2: Using PKGBUILD (For AUR)

If you wish to build from source using the standard Arch build system (makepkg), we have provided a `PKGBUILD` file in the `arch/` directory.

1.  **Navigate to the arch directory:**
    ```bash
    cd arch
    ```

2.  **Build and Install:**
    ```bash
    makepkg -si
    ```

## Option 3: AppImage

The build process also generates an `.AppImage` file in the `dist` directory. This is a portable executable that runs on most Linux distributions.

1.  **Build:** `npm run build:linux`
2.  **Run:**
    ```bash
    chmod +x dist/PixelPantry-1.0.1.AppImage
    ./dist/PixelPantry-1.0.1.AppImage
    ```
