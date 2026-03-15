#!/bin/bash
set -e

# Configuration
REPO_URL="https://github.com/G2OR/OpenClaw-Chat-Gateway.git"
INSTALL_DIR="$HOME/OpenClaw-Chat-Gateway"

# Terminal Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}    OpenClaw Chat Gateway - 一鍵安裝腳本       ${NC}"
echo -e "${BLUE}================================================${NC}"

# Check for Prerequisites
echo -e "\n${BLUE}步驟 1: 檢查運行環境...${NC}"

if ! command -v git &> /dev/null; then
    echo -e "${RED}錯誤: 未安裝 git。請先安裝 git。${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}錯誤: 未安裝 Node.js。請先安裝 Node.js (v18+)。${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}錯誤: 未安裝 npm。請先安裝 npm。${NC}"
    exit 1
fi

# Clone Repository
echo -e "\n${BLUE}步驟 2: 獲取項目源碼...${NC}"
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${BLUE}目錄 $INSTALL_DIR 已存在，正在更新...${NC}"
    cd "$INSTALL_DIR"
    git pull
else
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Run Deployment Script
echo -e "\n${BLUE}步驟 3: 初始化部署...${NC}"
chmod +x deploy-release.sh
./deploy-release.sh "$1" # Pass single port argument if provided

# Get local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}')
[ -z "$LOCAL_IP" ] && LOCAL_IP="localhost"

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}   安裝完成！ ${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "您現在可以訪問 OpenClaw Chat Gateway："
echo -e "本地訪問:   http://localhost:${1:-3115}"
echo -e "網絡訪問:   http://$LOCAL_IP:${1:-3115}"
echo -e "安裝目錄:   $INSTALL_DIR"
echo -e "------------------------------------------------"
echo -e "${BLUE}提示: 安裝 LibreOffice 可以獲得更好的文檔預覽體驗。${NC}"
echo -e "安裝指令: ${GREEN}sudo apt update && sudo apt install libreoffice -y${NC}"
echo -e "------------------------------------------------"
