"""
API 测试脚本
用于快速测试后端接口功能
"""

import requests
import json
from PIL import Image
import io

BASE_URL = "http://localhost:5000"

def test_health():
    """测试健康检查接口"""
    print("\n=== Testing Health Check ===")
    response = requests.get(f"{BASE_URL}/api/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")

def test_color_extraction():
    """测试色彩提取"""
    print("\n=== Testing Color Extraction ===")
    
    # 使用在线图片 URL
    data = {
        'image_url': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400'
    }
    
    response = requests.post(f"{BASE_URL}/api/extract-colors", data=data)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Extracted {len(result['colors'])} colors:")
        for color in result['colors']:
            print(f"  {color['hex']} - {color['percentage']}%")
    else:
        print(f"Error: {response.text}")

def test_vision_analysis():
    """测试视觉分析（需要 API Key）"""
    print("\n=== Testing Vision Analysis ===")
    print("⚠️  需要提供有效的 API Key")
    
    # 替换为你的 API Key
    api_key = input("Enter your OpenAI API Key (or press Enter to skip): ").strip()
    
    if not api_key:
        print("Skipped - No API key provided")
        return
    
    data = {
        'image_url': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400',
        'api_key': api_key,
        'model_name': 'gpt-4o'
    }
    
    response = requests.post(f"{BASE_URL}/api/analyze", data=data)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("Analysis completed:")
        print(f"  Raw text length: {len(result['analysis']['raw_text'])} chars")
        print(f"  Parsed sections: {list(result['analysis']['parsed'].keys())}")
    else:
        print(f"Error: {response.text}")

def test_asset_management():
    """测试素材管理"""
    print("\n=== Testing Asset Management ===")
    
    # 保存素材
    asset_data = {
        'title': 'Test Asset',
        'image_url': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
        'prompt': 'Abstract colorful flowing 3D digital gradient shape',
        'colors': [
            {'hex': '#6D5E00', 'percentage': 40},
            {'hex': '#FDE047', 'percentage': 35}
        ],
        'tags': ['Test', 'Gradient', '3D']
    }
    
    print("Saving asset...")
    response = requests.post(
        f"{BASE_URL}/api/assets",
        json=asset_data,
        headers={'Content-Type': 'application/json'}
    )
    print(f"Status: {response.status_code}")
    
    if response.status_code == 201:
        result = response.json()
        print(f"Asset saved with ID: {result['asset_id']}")
        
        # 获取素材列表
        print("\nFetching assets...")
        response = requests.get(f"{BASE_URL}/api/assets")
        if response.status_code == 200:
            assets = response.json()
            print(f"Found {assets['count']} assets")
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    print("🚀 Starting API Tests...")
    print(f"Base URL: {BASE_URL}")
    
    try:
        test_health()
        test_color_extraction()
        test_vision_analysis()
        test_asset_management()
        
        print("\n✅ Tests completed!")
    
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Cannot connect to backend server")
        print("Make sure the Flask server is running: python app.py")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
