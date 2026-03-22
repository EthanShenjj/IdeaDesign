#!/bin/bash

echo "🚀 Installing AI Vision Style Platform Backend..."
echo ""

# 检查 Python 版本
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python version: $python_version"

# 创建虚拟环境（可选）
read -p "Create virtual environment? (y/n): " create_venv
if [ "$create_venv" = "y" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "✓ Virtual environment activated"
fi

# 安装依赖
echo ""
echo "Installing dependencies..."
pip install -r requirements.txt

# 创建必要的目录
echo ""
echo "Creating directories..."
mkdir -p uploads
mkdir -p data

# 复制环境变量文件
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file..."
    cp .env.example .env
    echo "✓ .env file created"
    echo "⚠️  Please edit .env file if you want to use MySQL"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "To start the server:"
echo "  python app.py"
echo ""
echo "Or with virtual environment:"
echo "  source venv/bin/activate"
echo "  python app.py"
