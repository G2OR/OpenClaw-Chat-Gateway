#!/bin/bash
set -e

# Configuration
# If not in a project dir, default to ~/OpenClaw-Chat-Gateway
INSTALL_DIR="$HOME/OpenClaw-Chat-Gateway"
if [ -f "deploy-release.sh" ]; then
    PROJECT_ROOT="$(pwd)"
elif [ -d "$INSTALL_DIR" ]; then
    PROJECT_ROOT="$INSTALL_DIR"
else
    echo "Error: Could not find OpenClaw Chat Gateway installation."
    echo "Checked: $(pwd) and $INSTALL_DIR"
    exit 1
fi

SERVICE_DIR="$HOME/.config/systemd/user"

echo "================================================"
echo "   OpenClaw Chat Gateway - 更新腳本"
echo "================================================"

# 1. 從服務文件中探測現有端口
EXISTING_PORT=""
SERVICES=$(ls $SERVICE_DIR/clawui-*.service 2>/dev/null | sort -V || true)

if [ -n "$SERVICES" ]; then
    # 使用找到的第一個服務端口作為默認值
    FIRST_SERVICE=$(echo "$SERVICES" | head -n 1)
    EXISTING_PORT=$(basename "$FIRST_SERVICE" | sed 's/clawui-\([0-9]*\)\.service/\1/')
    echo "檢測到正在運行的端口: $EXISTING_PORT"
else
    # 檢查舊版服務文件
    if [ -f "$SERVICE_DIR/clawui.service" ]; then
        EXISTING_PORT="3115"
        echo "檢測到舊版安裝 (端口 3115)"
    fi
fi

TARGET_PORT=${1:-$EXISTING_PORT}
TARGET_PORT=${TARGET_PORT:-3115}

echo "正在從 GitHub 更新代碼，目錄: $PROJECT_ROOT..."
cd "$PROJECT_ROOT"
git pull

echo "開始升級端口 $TARGET_PORT 的服務..."
./deploy-release.sh "$TARGET_PORT"

echo "================================================"
echo "升級完成！"
echo "您的配置和數據已保留。"
echo "================================================"
