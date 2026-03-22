"""
测试认证功能
"""

import requests
import json

BASE_URL = 'http://localhost:5001'

def test_health():
    """测试健康检查"""
    print("\n=== 测试健康检查 ===")
    response = requests.get(f'{BASE_URL}/api/health')
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    return response.status_code == 200

def test_register():
    """测试注册"""
    print("\n=== 测试注册 ===")
    data = {
        'username': 'testuser',
        'password': 'test123456'
    }
    response = requests.post(f'{BASE_URL}/api/auth/register', json=data)
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    return response.status_code in [200, 201, 400]  # 400 可能是用户已存在

def test_login_admin():
    """测试默认管理员登录"""
    print("\n=== 测试管理员登录 ===")
    data = {
        'username': 'admin',
        'password': 'admin123456'
    }
    response = requests.post(f'{BASE_URL}/api/auth/login', json=data)
    print(f"状态码: {response.status_code}")
    result = response.json()
    print(f"响应: {result}")
    
    if response.status_code == 200 and result.get('success'):
        user = result.get('user')
        print(f"\n登录成功！")
        print(f"用户ID: {user.get('id')}")
        print(f"用户名: {user.get('username')}")
        print(f"头像: {user.get('avatar')}")
        return True
    return False

def test_login_testuser():
    """测试普通用户登录"""
    print("\n=== 测试普通用户登录 ===")
    data = {
        'username': 'testuser',
        'password': 'test123456'
    }
    response = requests.post(f'{BASE_URL}/api/auth/login', json=data)
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    return response.status_code == 200

def test_login_wrong_password():
    """测试错误密码"""
    print("\n=== 测试错误密码 ===")
    data = {
        'username': 'admin',
        'password': 'wrongpassword'
    }
    response = requests.post(f'{BASE_URL}/api/auth/login', json=data)
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    return response.status_code == 401

def test_register_weak_password():
    """测试弱密码"""
    print("\n=== 测试弱密码注册 ===")
    data = {
        'username': 'weakuser',
        'password': '12345'  # 少于6位
    }
    response = requests.post(f'{BASE_URL}/api/auth/register', json=data)
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    return response.status_code == 400

def test_register_no_letter():
    """测试纯数字密码"""
    print("\n=== 测试纯数字密码注册 ===")
    data = {
        'username': 'numberuser',
        'password': '123456'  # 只有数字
    }
    response = requests.post(f'{BASE_URL}/api/auth/register', json=data)
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    return response.status_code == 400

if __name__ == '__main__':
    print("=" * 50)
    print("开始测试认证功能")
    print("=" * 50)
    
    try:
        # 测试健康检查
        if not test_health():
            print("\n❌ 健康检查失败，请确保后端服务已启动")
            exit(1)
        
        # 测试注册
        test_register()
        
        # 测试登录
        if test_login_admin():
            print("\n✅ 管理员登录测试通过")
        else:
            print("\n❌ 管理员登录测试失败")
        
        # 测试普通用户登录
        test_login_testuser()
        
        # 测试错误密码
        if test_login_wrong_password():
            print("\n✅ 错误密码测试通过")
        else:
            print("\n❌ 错误密码测试失败")
        
        # 测试弱密码
        if test_register_weak_password():
            print("\n✅ 弱密码验证测试通过")
        else:
            print("\n❌ 弱密码验证测试失败")
        
        # 测试纯数字密码
        if test_register_no_letter():
            print("\n✅ 纯数字密码验证测试通过")
        else:
            print("\n❌ 纯数字密码验证测试失败")
        
        print("\n" + "=" * 50)
        print("测试完成！")
        print("=" * 50)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ 无法连接到后端服务")
        print("请确保后端服务已启动: python backend/app.py")
    except Exception as e:
        print(f"\n❌ 测试出错: {e}")
        import traceback
        traceback.print_exc()
