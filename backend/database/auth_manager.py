"""
用户认证管理模块
处理用户注册、登录、密码加密等功能
"""

import hashlib
from typing import Optional, Dict
from datetime import datetime
import sqlite3


class AuthManager:
    """用户认证管理器"""
    
    def __init__(self, db_connection, db_type='sqlite'):
        """
        初始化认证管理器
        
        Args:
            db_connection: 数据库连接对象
            db_type: 数据库类型 ('sqlite' 或 'mysql')
        """
        self.connection = db_connection
        self.db_type = db_type
        self.create_user_table()
        self.create_default_admin()
    
    def create_user_table(self):
        """创建用户表"""
        if not self.connection:
            return
        
        try:
            cursor = self.connection.cursor()
            
            if self.db_type == 'sqlite':
                # SQLite 语法
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        avatar TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        last_login TIMESTAMP NULL
                    )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_username ON users(username)")
            else:
                # MySQL 语法
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        username VARCHAR(50) UNIQUE NOT NULL,
                        password_hash VARCHAR(64) NOT NULL,
                        avatar VARCHAR(10) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        last_login TIMESTAMP NULL,
                        INDEX idx_username (username)
                    )
                """)
            
            self.connection.commit()
            cursor.close()
            print("✓ User table created")
        
        except Exception as e:
            print(f"✗ Error creating user table: {e}")
    
    def hash_password(self, password: str) -> str:
        """
        使用 SHA-256 加密密码（32位十六进制）
        
        Args:
            password: 明文密码
            
        Returns:
            32位加密后的密码
        """
        return hashlib.sha256(password.encode()).hexdigest()
    
    def validate_password(self, password: str) -> tuple[bool, str]:
        """
        验证密码强度
        
        Args:
            password: 待验证的密码
            
        Returns:
            (是否有效, 错误信息)
        """
        if len(password) < 6:
            return False, "密码长度不能少于6位"
        
        has_letter = any(c.isalpha() for c in password)
        has_digit = any(c.isdigit() for c in password)
        
        if not (has_letter and has_digit):
            return False, "密码必须包含字母和数字"
        
        return True, ""
    
    def get_avatar_initial(self, username: str) -> str:
        """
        获取用户名首字母作为头像
        
        Args:
            username: 用户名
            
        Returns:
            首字母（大写）
        """
        if not username:
            return "U"
        return username[0].upper()
    
    def register(self, username: str, password: str) -> tuple[bool, str, Optional[Dict]]:
        """
        用户注册
        
        Args:
            username: 用户名
            password: 密码
            
        Returns:
            (是否成功, 消息, 用户信息)
        """
        if not self.connection:
            return False, "数据库连接失败", None
        
        # 验证用户名
        if not username or len(username) < 3:
            return False, "用户名长度不能少于3位", None
        
        # 验证密码
        is_valid, error_msg = self.validate_password(password)
        if not is_valid:
            return False, error_msg, None
        
        try:
            cursor = self.connection.cursor()
            
            # 检查用户名是否已存在
            if self.db_type == 'sqlite':
                cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
            else:
                cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
            
            if cursor.fetchone():
                cursor.close()
                return False, "用户名已存在", None
            
            # 加密密码
            password_hash = self.hash_password(password)
            
            # 生成头像（首字母）
            avatar = self.get_avatar_initial(username)
            
            # 插入用户
            if self.db_type == 'sqlite':
                cursor.execute("""
                    INSERT INTO users (username, password_hash, avatar)
                    VALUES (?, ?, ?)
                """, (username, password_hash, avatar))
            else:
                cursor.execute("""
                    INSERT INTO users (username, password_hash, avatar)
                    VALUES (%s, %s, %s)
                """, (username, password_hash, avatar))
            
            self.connection.commit()
            user_id = cursor.lastrowid
            cursor.close()
            
            user_info = {
                'id': user_id,
                'username': username,
                'avatar': avatar
            }
            
            return True, "注册成功", user_info
        
        except Exception as e:
            print(f"Registration error: {e}")
            return False, f"注册失败: {str(e)}", None
    
    def login(self, username: str, password: str) -> tuple[bool, str, Optional[Dict]]:
        """
        用户登录
        
        Args:
            username: 用户名
            password: 密码
            
        Returns:
            (是否成功, 消息, 用户信息)
        """
        if not self.connection:
            return False, "数据库连接失败", None
        
        try:
            cursor = self.connection.cursor()
            
            # 查询用户
            if self.db_type == 'sqlite':
                cursor.execute("""
                    SELECT id, username, password_hash, avatar
                    FROM users
                    WHERE username = ?
                """, (username,))
            else:
                cursor.execute("""
                    SELECT id, username, password_hash, avatar
                    FROM users
                    WHERE username = %s
                """, (username,))
            
            row = cursor.fetchone()
            
            if not row:
                cursor.close()
                return False, "用户名或密码错误", None
            
            # 转换为字典
            if self.db_type == 'sqlite':
                user = dict(row) if hasattr(row, 'keys') else {
                    'id': row[0],
                    'username': row[1],
                    'password_hash': row[2],
                    'avatar': row[3]
                }
            else:
                user = row
            
            # 验证密码
            password_hash = self.hash_password(password)
            if password_hash != user['password_hash']:
                cursor.close()
                return False, "用户名或密码错误", None
            
            # 更新最后登录时间
            if self.db_type == 'sqlite':
                cursor.execute("""
                    UPDATE users
                    SET last_login = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (user['id'],))
            else:
                cursor.execute("""
                    UPDATE users
                    SET last_login = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (user['id'],))
            
            self.connection.commit()
            cursor.close()
            
            user_info = {
                'id': user['id'],
                'username': user['username'],
                'avatar': user['avatar']
            }
            
            return True, "登录成功", user_info
        
        except Exception as e:
            print(f"Login error: {e}")
            return False, f"登录失败: {str(e)}", None
    
    def create_default_admin(self):
        """创建默认管理员账号"""
        if not self.connection:
            return
        
        try:
            cursor = self.connection.cursor()
            
            # 检查是否已存在 admin 账号
            if self.db_type == 'sqlite':
                cursor.execute("SELECT id FROM users WHERE username = ?", ('admin',))
            else:
                cursor.execute("SELECT id FROM users WHERE username = %s", ('admin',))
            
            if cursor.fetchone():
                cursor.close()
                return
            
            # 创建默认管理员
            password_hash = self.hash_password('admin123456')
            avatar = 'A'
            
            if self.db_type == 'sqlite':
                cursor.execute("""
                    INSERT INTO users (username, password_hash, avatar)
                    VALUES (?, ?, ?)
                """, ('admin', password_hash, avatar))
            else:
                cursor.execute("""
                    INSERT INTO users (username, password_hash, avatar)
                    VALUES (%s, %s, %s)
                """, ('admin', password_hash, avatar))
            
            self.connection.commit()
            cursor.close()
            print("✓ Default admin account created (username: admin, password: admin123456)")
        
        except Exception as e:
            print(f"✗ Error creating default admin: {e}")
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        """
        根据 ID 获取用户信息
        
        Args:
            user_id: 用户 ID
            
        Returns:
            用户信息字典或 None
        """
        if not self.connection:
            return None
        
        try:
            cursor = self.connection.cursor()
            
            if self.db_type == 'sqlite':
                cursor.execute("""
                    SELECT id, username, avatar, created_at, last_login
                    FROM users
                    WHERE id = ?
                """, (user_id,))
            else:
                cursor.execute("""
                    SELECT id, username, avatar, created_at, last_login
                    FROM users
                    WHERE id = %s
                """, (user_id,))
            
            row = cursor.fetchone()
            cursor.close()
            
            if not row:
                return None
            
            # 转换为字典
            if self.db_type == 'sqlite':
                user = dict(row) if hasattr(row, 'keys') else {
                    'id': row[0],
                    'username': row[1],
                    'avatar': row[2],
                    'created_at': row[3],
                    'last_login': row[4]
                }
            else:
                user = row
            
            # 格式化时间
            if user.get('created_at'):
                user['created_at'] = str(user['created_at'])
            if user.get('last_login'):
                user['last_login'] = str(user['last_login'])
            
            return user
        
        except Exception as e:
            print(f"Error fetching user: {e}")
            return None
