"""
数据库管理模块
使用 MySQL 存储素材数据
"""

import mysql.connector
from mysql.connector import Error
import json
from datetime import datetime
from typing import List, Dict, Optional
import os


class DatabaseManager:
    """MySQL 数据库管理器"""
    
    def __init__(self):
        """初始化数据库连接"""
        self.connection = None
        self.connect()
        self.create_tables()
    
    def connect(self):
        """建立数据库连接"""
        try:
            self.connection = mysql.connector.connect(
                host=os.getenv('DB_HOST', 'localhost'),
                port=int(os.getenv('DB_PORT', 3306)),
                user=os.getenv('DB_USER', 'root'),
                password=os.getenv('DB_PASSWORD', 'rootroot'),
                database=os.getenv('DB_NAME', 'ideaDesign')
            )
            
            if self.connection.is_connected():
                print("✓ MySQL database connected successfully")
        
        except Error as e:
            print(f"✗ Error connecting to MySQL: {e}")
            # 如果连接失败，尝试创建数据库
            self._create_database()
    
    def _create_database(self):
        """创建数据库（如果不存在）"""
        try:
            connection = mysql.connector.connect(
                host=os.getenv('DB_HOST', 'localhost'),
                port=int(os.getenv('DB_PORT', 3306)),
                user=os.getenv('DB_USER', 'root'),
                password=os.getenv('DB_PASSWORD', '')
            )
            
            cursor = connection.cursor()
            db_name = os.getenv('DB_NAME', 'ai_vision_style')
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
            print(f"✓ Database '{db_name}' created")
            
            cursor.close()
            connection.close()
            
            # 重新连接
            self.connect()
        
        except Error as e:
            print(f"✗ Error creating database: {e}")
    
    def create_tables(self):
        """创建数据表"""
        if not self.connection or not self.connection.is_connected():
            return
        
        try:
            cursor = self.connection.cursor()
            
            # 历史记录表（所有解析记录）
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    image_url TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    colors JSON NOT NULL,
                    tags JSON,
                    analysis JSON,
                    is_saved BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_title (title),
                    INDEX idx_created_at (created_at),
                    INDEX idx_is_saved (is_saved)
                )
            """)
            
            # 素材表（仅收藏的素材）
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS assets (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    history_id INT,
                    title VARCHAR(255) NOT NULL,
                    image_url TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    colors JSON NOT NULL,
                    tags JSON,
                    analysis JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_title (title),
                    INDEX idx_created_at (created_at),
                    FOREIGN KEY (history_id) REFERENCES history(id) ON DELETE SET NULL
                )
            """)
            
            # 标签表（用于快速筛选）
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tags (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) UNIQUE NOT NULL,
                    count INT DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            self.connection.commit()
            cursor.close()
            print("✓ Database tables created")
        
        except Error as e:
            print(f"✗ Error creating tables: {e}")
    
    def save_asset(
        self,
        title: str,
        image_url: str,
        prompt: str,
        colors: List[Dict],
        tags: List[str] = None,
        analysis: Dict = None
    ) -> int:
        """
        保存素材到数据库（收藏）
        
        Returns:
            新创建的素材 ID
        """
        if not self.connection or not self.connection.is_connected():
            raise Exception("Database not connected")
        
        try:
            cursor = self.connection.cursor()
            
            query = """
                INSERT INTO assets (title, image_url, prompt, colors, tags, analysis)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            
            values = (
                title,
                image_url,
                prompt,
                json.dumps(colors),
                json.dumps(tags) if tags else None,
                json.dumps(analysis) if analysis else None
            )
            
            cursor.execute(query, values)
            self.connection.commit()
            
            asset_id = cursor.lastrowid
            
            # 更新标签计数
            if tags:
                self._update_tags(tags)
            
            cursor.close()
            return asset_id
        
        except Error as e:
            raise Exception(f"Failed to save asset: {e}")
    
    def save_history(
        self,
        title: str,
        image_url: str,
        prompt: str,
        colors: List[Dict],
        tags: List[str] = None,
        analysis: Dict = None
    ) -> int:
        """
        保存到历史记录
        
        Returns:
            新创建的历史记录 ID
        """
        if not self.connection or not self.connection.is_connected():
            raise Exception("Database not connected")
        
        try:
            cursor = self.connection.cursor()
            
            query = """
                INSERT INTO history (title, image_url, prompt, colors, tags, analysis, is_saved)
                VALUES (%s, %s, %s, %s, %s, %s, FALSE)
            """
            
            values = (
                title,
                image_url,
                prompt,
                json.dumps(colors),
                json.dumps(tags) if tags else None,
                json.dumps(analysis) if analysis else None
            )
            
            cursor.execute(query, values)
            self.connection.commit()
            
            history_id = cursor.lastrowid
            cursor.close()
            return history_id
        
        except Error as e:
            raise Exception(f"Failed to save history: {e}")
    
    def get_history(
        self,
        tag: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict]:
        """
        获取历史记录列表
        """
        if not self.connection or not self.connection.is_connected():
            return []
        
        try:
            cursor = self.connection.cursor(dictionary=True)
            
            query = """
                SELECT h.*, 
                       CASE WHEN a.id IS NOT NULL THEN TRUE ELSE FALSE END as is_saved
                FROM history h
                LEFT JOIN assets a ON h.id = a.history_id
                WHERE 1=1
            """
            params = []
            
            # 标签筛选
            if tag:
                query += " AND JSON_CONTAINS(h.tags, %s)"
                params.append(json.dumps(tag))
            
            # 关键词搜索
            if search:
                query += " AND (h.title LIKE %s OR h.prompt LIKE %s)"
                search_pattern = f"%{search}%"
                params.extend([search_pattern, search_pattern])
            
            query += " ORDER BY h.created_at DESC LIMIT %s"
            params.append(limit)
            
            cursor.execute(query, params)
            history_items = cursor.fetchall()
            
            # 解析 JSON 字段
            for item in history_items:
                item['colors'] = json.loads(item['colors']) if item['colors'] else []
                item['tags'] = json.loads(item['tags']) if item['tags'] else []
                item['analysis'] = json.loads(item['analysis']) if item['analysis'] else {}
                item['created_at'] = item['created_at'].isoformat() if item['created_at'] else None
                item['updated_at'] = item['updated_at'].isoformat() if item['updated_at'] else None
            
            cursor.close()
            return history_items
        
        except Error as e:
            print(f"Error fetching history: {e}")
            return []
    
    def get_history_by_id(self, history_id: int) -> Optional[Dict]:
        """根据 ID 获取单个历史记录"""
        if not self.connection or not self.connection.is_connected():
            return None
        
        try:
            cursor = self.connection.cursor(dictionary=True)
            query = """
                SELECT h.*, 
                       CASE WHEN a.id IS NOT NULL THEN TRUE ELSE FALSE END as is_saved
                FROM history h
                LEFT JOIN assets a ON h.id = a.history_id
                WHERE h.id = %s
            """
            cursor.execute(query, (history_id,))
            item = cursor.fetchone()
            
            if item:
                # 解析 JSON 字段
                item['colors'] = json.loads(item['colors']) if item['colors'] else []
                item['tags'] = json.loads(item['tags']) if item['tags'] else []
                item['analysis'] = json.loads(item['analysis']) if item['analysis'] else {}
                item['created_at'] = item['created_at'].isoformat() if item['created_at'] else None
                item['updated_at'] = item['updated_at'].isoformat() if item['updated_at'] else None
            
            cursor.close()
            return item
        
        except Error as e:
            print(f"Error fetching history by id: {e}")
            return None
    
    def save_history_to_assets(self, history_id: int) -> int:
        """
        将历史记录保存到素材库（收藏）
        
        Returns:
            新创建的素材 ID
        """
        if not self.connection or not self.connection.is_connected():
            raise Exception("Database not connected")
        
        try:
            cursor = self.connection.cursor(dictionary=True)
            
            # 获取历史记录
            cursor.execute("SELECT * FROM history WHERE id = %s", (history_id,))
            history = cursor.fetchone()
            
            if not history:
                raise Exception("History not found")
            
            # 检查是否已经收藏
            cursor.execute("SELECT id FROM assets WHERE history_id = %s", (history_id,))
            existing = cursor.fetchone()
            
            if existing:
                return existing['id']
            
            # 插入到素材表
            query = """
                INSERT INTO assets (history_id, title, image_url, prompt, colors, tags, analysis)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            
            values = (
                history_id,
                history['title'],
                history['image_url'],
                history['prompt'],
                history['colors'],
                history['tags'],
                history['analysis']
            )
            
            cursor.execute(query, values)
            self.connection.commit()
            
            asset_id = cursor.lastrowid
            
            # 更新标签计数
            if history['tags']:
                tags = json.loads(history['tags'])
                self._update_tags(tags)
            
            cursor.close()
            return asset_id
        
        except Error as e:
            raise Exception(f"Failed to save to assets: {e}")
    
    def remove_from_assets(self, history_id: int) -> bool:
        """
        从素材库移除（取消收藏）
        
        Returns:
            是否成功
        """
        if not self.connection or not self.connection.is_connected():
            return False
        
        try:
            cursor = self.connection.cursor()
            cursor.execute("DELETE FROM assets WHERE history_id = %s", (history_id,))
            self.connection.commit()
            cursor.close()
            return True
        
        except Error as e:
            print(f"Error removing from assets: {e}")
            return False
    
    def get_assets(
        self,
        tag: Optional[str] = None,
        search: Optional[str] = None,
        color: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """
        获取素材列表
        
        Args:
            tag: 按标签筛选
            search: 搜索关键词
            color: 按颜色筛选（HEX 值）
            limit: 返回数量限制
        """
        if not self.connection or not self.connection.is_connected():
            return []
        
        try:
            cursor = self.connection.cursor(dictionary=True)
            
            query = "SELECT * FROM assets WHERE 1=1"
            params = []
            
            # 标签筛选
            if tag:
                query += " AND JSON_CONTAINS(tags, %s)"
                params.append(json.dumps(tag))
            
            # 关键词搜索
            if search:
                query += " AND (title LIKE %s OR prompt LIKE %s)"
                search_pattern = f"%{search}%"
                params.extend([search_pattern, search_pattern])
            
            # 颜色筛选（简单匹配）
            if color:
                query += " AND JSON_SEARCH(colors, 'one', %s) IS NOT NULL"
                params.append(color)
            
            query += " ORDER BY created_at DESC LIMIT %s"
            params.append(limit)
            
            cursor.execute(query, params)
            assets = cursor.fetchall()
            
            # 解析 JSON 字段
            for asset in assets:
                asset['colors'] = json.loads(asset['colors']) if asset['colors'] else []
                asset['tags'] = json.loads(asset['tags']) if asset['tags'] else []
                asset['analysis'] = json.loads(asset['analysis']) if asset['analysis'] else {}
                asset['created_at'] = asset['created_at'].isoformat() if asset['created_at'] else None
                asset['updated_at'] = asset['updated_at'].isoformat() if asset['updated_at'] else None
            
            cursor.close()
            return assets
        
        except Error as e:
            print(f"Error fetching assets: {e}")
            return []
    
    def get_asset_by_id(self, asset_id: int) -> Optional[Dict]:
        """根据 ID 获取单个素材"""
        if not self.connection or not self.connection.is_connected():
            return None
        
        try:
            cursor = self.connection.cursor(dictionary=True)
            cursor.execute("SELECT * FROM assets WHERE id = %s", (asset_id,))
            asset = cursor.fetchone()
            
            if asset:
                # 解析 JSON 字段
                asset['colors'] = json.loads(asset['colors']) if asset['colors'] else []
                asset['tags'] = json.loads(asset['tags']) if asset['tags'] else []
                asset['analysis'] = json.loads(asset['analysis']) if asset['analysis'] else {}
                asset['created_at'] = asset['created_at'].isoformat() if asset['created_at'] else None
                asset['updated_at'] = asset['updated_at'].isoformat() if asset['updated_at'] else None
            
            cursor.close()
            return asset
        
        except Error as e:
            print(f"Error fetching asset by id: {e}")
            return None
    
    def delete_asset(self, asset_id: int) -> bool:
        """删除素材"""
        if not self.connection or not self.connection.is_connected():
            return False
        
        try:
            cursor = self.connection.cursor()
            cursor.execute("DELETE FROM assets WHERE id = %s", (asset_id,))
            self.connection.commit()
            cursor.close()
            return True
        
        except Error as e:
            print(f"Error deleting asset: {e}")
            return False
    
    def delete_history(self, history_id: int) -> bool:
        """删除历史记录"""
        if not self.connection or not self.connection.is_connected():
            return False
        
        try:
            cursor = self.connection.cursor()
            cursor.execute("DELETE FROM history WHERE id = %s", (history_id,))
            self.connection.commit()
            cursor.close()
            return True
        
        except Error as e:
            print(f"Error deleting history: {e}")
            return False
    
    def _update_tags(self, tags: List[str]):
        """更新标签计数"""
        if not self.connection or not self.connection.is_connected():
            return
        
        try:
            cursor = self.connection.cursor()
            
            for tag in tags:
                cursor.execute("""
                    INSERT INTO tags (name, count)
                    VALUES (%s, 1)
                    ON DUPLICATE KEY UPDATE count = count + 1
                """, (tag,))
            
            self.connection.commit()
            cursor.close()
        
        except Error as e:
            print(f"Error updating tags: {e}")
    
    def get_popular_tags(self, limit: int = 20) -> List[Dict]:
        """获取热门标签"""
        if not self.connection or not self.connection.is_connected():
            return []
        
        try:
            cursor = self.connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT name, count FROM tags
                ORDER BY count DESC
                LIMIT %s
            """, (limit,))
            
            tags = cursor.fetchall()
            cursor.close()
            return tags
        
        except Error as e:
            print(f"Error fetching tags: {e}")
            return []
    
    def close(self):
        """关闭数据库连接"""
        if self.connection and self.connection.is_connected():
            self.connection.close()
            print("✓ MySQL connection closed")
