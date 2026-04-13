#!/bin/bash
# Download Syne and DM Sans fonts from Google Fonts CDN

FONTS_DIR="./assets/fonts"
mkdir -p "$FONTS_DIR"

echo "Downloading Syne fonts..."
curl -L "https://fonts.gstatic.com/s/syne/v22/8vIS7w4qzmVxsWxjBZRjr0FKM_04uQ.ttf" -o "$FONTS_DIR/Syne-Regular.ttf"
curl -L "https://fonts.gstatic.com/s/syne/v22/8vIS7w4qzmVxsWxjBZRjr0FKM_0kuQ.ttf" -o "$FONTS_DIR/Syne-Bold.ttf"
curl -L "https://fonts.gstatic.com/s/syne/v22/8vIS7w4qzmVxsWxjBZRjr0FKM_0HuQ.ttf" -o "$FONTS_DIR/Syne-ExtraBold.ttf"

echo "Downloading DM Sans fonts..."
curl -L "https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZa4ET-DNl0.ttf" -o "$FONTS_DIR/DMSans-Regular.ttf"
curl -L "https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZa4FD-DNl0.ttf" -o "$FONTS_DIR/DMSans-Medium.ttf"
curl -L "https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZa4Ij-DNl0.ttf" -o "$FONTS_DIR/DMSans-Bold.ttf"

echo "✓ Fonts downloaded to $FONTS_DIR"
ls -la "$FONTS_DIR"
