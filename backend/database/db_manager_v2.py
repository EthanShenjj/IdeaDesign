"""
数据库管理模块 - 支持 MySQL 和 SQLite
"""

import json
from datetime import datetime
from typing import List, Dict, Optional
import os
import sqlite3


class DatabaseManager:
    """数据库管理器 - 使用 SQLite（简单易用，无需额外配置）"""
    
    def __init__(self):
        """初始化数据库连接"""
        self.connection = None
        self.db_type = 'sqlite'
        self.connect_sqlite()
        self.create_tables()
    
    def connect_sqlite(self):
        """建立 SQLite 数据库连接"""
        db_path = os.getenv('SQLITE_DB_PATH', 'data/ideaDesign.db')
        os.makedirs(os.path.dirname(db_path) if os.path.dirname(db_path) else 'data', exist_ok=True)
        
        self.connection = sqlite3.connect(db_path, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        print(f"✓ SQLite database connected: {db_path}")
    
    def create_tables(self):
        """创建数据表"""
        if not self.connection:
            return
        
        try:
            cursor = self.connection.cursor()
            
            # 素材表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS assets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    image_url TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    colors TEXT NOT NULL,
                    tags TEXT,
                    analysis TEXT,
                    is_saved INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 如果表已存在，尝试添加 is_saved 列
            try:
                cursor.execute("ALTER TABLE assets ADD COLUMN is_saved INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                # 列可能已经存在，忽略错误
                pass
            
            # 标签表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    count INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 创建索引
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_assets_title ON assets(title)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_assets_created ON assets(created_at DESC)")
            
            self.connection.commit()
            cursor.close()
            print("✓ Database tables created")
        
        except Exception as e:
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
        保存素材到数据库
        
        analysis 结构按照详情页模块组织：
        {
            "style": {  # 风格描述模块
                "composition": "...",
                "art_style": "...",
                "lighting": "...",
                "mood": "...",
                "medium": "...",
                "technical": "...",
                "elements": "..."
            },
            "colors": {  # 色彩模块
                "color_palette": "...",  # AI色彩方案描述
                "color_classification": {  # AI色彩分类
                    "primary": "#XXXXXX",
                    "secondary": "#XXXXXX",
                    "tertiary": "#XXXXXX",
                    "neutral": "#XXXXXX"
                }
            },
            "prompt": {  # 提示词模块
                "ai_prompt": "...",  # AI生成的提示词
                "style_tags": "...",  # 风格标签
                "style_name": "..."  # 风格名称
            },
            "metadata": {  # 元数据
                "model": "...",
                "success": true
            }
        }
        """
        if not self.connection:
            raise Exception("Database not connected")
        
        try:
            cursor = self.connection.cursor()
            
            query = """
                INSERT INTO assets (title, image_url, prompt, colors, tags, analysis)
                VALUES (?, ?, ?, ?, ?, ?)
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
            
            # 如果是明确保存（即作为素材保存），设置 is_saved 为 1
            # 注意：单独的 save_asset 通常用于手动保存
            cursor.execute("UPDATE assets SET is_saved = 1 WHERE id = ?", (asset_id,))
            self.connection.commit()
            
            # 更新标签计数
            if tags:
                self._update_tags(tags)
            
            cursor.close()
            return asset_id
        
        except Exception as e:
            raise Exception(f"Failed to save asset: {e}")
    
    def get_assets(
        self,
        tag: Optional[str] = None,
        search: Optional[str] = None,
        color: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """获取素材列表"""
        if not self.connection:
            return []
        
        try:
            cursor = self.connection.cursor()
            
            # 默认只获取已收藏的素材
            query = "SELECT * FROM assets WHERE is_saved = 1"
            params = []
            
            # 关键词搜索
            if search:
                query += " AND (title LIKE ? OR prompt LIKE ?)"
                search_pattern = f"%{search}%"
                params.extend([search_pattern, search_pattern])
            
            # 标签筛选
            if tag:
                query += " AND tags LIKE ?"
                params.append(f'%"{tag}"%')
            
            # 颜色筛选
            if color:
                query += " AND colors LIKE ?"
                params.append(f'%{color}%')
            
            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            # 转换为字典列表
            assets = []
            for row in rows:
                asset = dict(row)
                asset['colors'] = json.loads(asset['colors']) if asset['colors'] else []
                asset['tags'] = json.loads(asset['tags']) if asset['tags'] else []
                asset['analysis'] = json.loads(asset['analysis']) if asset['analysis'] else {}
                assets.append(asset)
            
            cursor.close()
            return assets
        
        except Exception as e:
            print(f"Error fetching assets: {e}")
            return []
    
    def get_asset_by_id(self, asset_id: int) -> Optional[Dict]:
        """根据 ID 获取单个素材"""
        if not self.connection:
            return None
        
        try:
            cursor = self.connection.cursor()
            cursor.execute("SELECT * FROM assets WHERE id = ?", (asset_id,))
            row = cursor.fetchone()
            
            if row:
                asset = dict(row)
                # 解析 JSON 字段
                asset['colors'] = json.loads(asset['colors']) if asset['colors'] else []
                asset['tags'] = json.loads(asset['tags']) if asset['tags'] else []
                asset['analysis'] = json.loads(asset['analysis']) if asset['analysis'] else {}
                cursor.close()
                return asset
            
            cursor.close()
            return None
        
        except Exception as e:
            print(f"Error fetching asset by id: {e}")
            return None
    
    def delete_asset(self, asset_id: int) -> bool:
        """删除素材"""
        if not self.connection:
            return False
        
        try:
            cursor = self.connection.cursor()
            cursor.execute("DELETE FROM assets WHERE id = ?", (asset_id,))
            self.connection.commit()
            cursor.close()
            return True
        
        except Exception as e:
            print(f"Error deleting asset: {e}")
            return False
    
    def delete_history(self, history_id: int) -> bool:
        """删除历史记录"""
        if not self.connection:
            return False
        
        try:
            cursor = self.connection.cursor()
            cursor.execute("DELETE FROM history WHERE id = ?", (history_id,))
            self.connection.commit()
            cursor.close()
            return True
        
        except Exception as e:
            print(f"Error deleting history: {e}")
            return False
    
    def _update_tags(self, tags: List[str]):
        """更新标签计数"""
        if not self.connection:
            return
        
        try:
            cursor = self.connection.cursor()
            
            for tag in tags:
                # 检查标签是否存在
                cursor.execute("SELECT id, count FROM tags WHERE name = ?", (tag,))
                row = cursor.fetchone()
                
                if row:
                    # 更新计数
                    cursor.execute("UPDATE tags SET count = count + 1 WHERE name = ?", (tag,))
                else:
                    # 插入新标签
                    cursor.execute("INSERT INTO tags (name, count) VALUES (?, 1)", (tag,))
            
            self.connection.commit()
            cursor.close()
        
        except Exception as e:
            print(f"Error updating tags: {e}")
    
    def get_popular_tags(self, limit: int = 20) -> List[Dict]:
        """获取热门标签"""
        if not self.connection:
            return []
        
        try:
            cursor = self.connection.cursor()
            cursor.execute("""
                SELECT name, count FROM tags
                ORDER BY count DESC
                LIMIT ?
            """, (limit,))
            
            rows = cursor.fetchall()
            tags = [dict(row) for row in rows]
            cursor.close()
            return tags
        
        except Exception as e:
            print(f"Error fetching tags: {e}")
            return []
    
    def get_history(
        self,
        tag: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict]:
        """
        注意：SQLite 版本中，history 和 assets 是同一张表
        """
        # 获取所有记录，不论是否收藏
        if not self.connection:
            return []
            
        try:
            cursor = self.connection.cursor()
            query = "SELECT * FROM assets WHERE 1=1"
            params = []
            
            if search:
                query += " AND (title LIKE ? OR prompt LIKE ?)"
                search_pattern = f"%{search}%"
                params.extend([search_pattern, search_pattern])
                
            if tag:
                query += " AND tags LIKE ?"
                params.append(f'%"{tag}"%')
                
            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            history = []
            for row in rows:
                item = dict(row)
                item['colors'] = json.loads(item['colors']) if item['colors'] else []
                item['tags'] = json.loads(item['tags']) if item['tags'] else []
                item['analysis'] = json.loads(item['analysis']) if item['analysis'] else {}
                history.append(item)
                
            cursor.close()
            return history
        except Exception as e:
            print(f"Error fetching history: {e}")
            return []
    
    def get_history_by_id(self, history_id: int) -> Optional[Dict]:
        """
        根据 ID 获取单个历史记录
        注意：SQLite 版本中，history 和 assets 是同一张表
        """
        return self.get_asset_by_id(history_id)
    
    def save_history(
        self,
        title: str,
        image_url: str,
        prompt: str,
        colors: List[Dict],
        tags: List[str] = None,
        analysis: Dict = None
    ) -> int:
        """保存到历史记录，初始不设为收藏"""
        if not self.connection:
            raise Exception("Database not connected")
            
        try:
            cursor = self.connection.cursor()
            query = """
                INSERT INTO assets (title, image_url, prompt, colors, tags, analysis, is_saved)
                VALUES (?, ?, ?, ?, ?, ?, 0)
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
            return cursor.lastrowid
        except Exception as e:
            raise Exception(f"Failed to save history: {e}")
    
    def save_history_to_assets(self, history_id: int) -> int:
        """将历史记录标记为收藏"""
        if not self.connection:
            return history_id
            
        try:
            cursor = self.connection.cursor()
            cursor.execute("UPDATE assets SET is_saved = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (history_id,))
            self.connection.commit()
            cursor.close()
            return history_id
        except Exception as e:
            print(f"Error saving to assets: {e}")
            return history_id

    def remove_from_assets(self, history_id: int) -> bool:
        """取消收藏"""
        if not self.connection:
            return False
            
        try:
            cursor = self.connection.cursor()
            cursor.execute("UPDATE assets SET is_saved = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (history_id,))
            self.connection.commit()
            cursor.close()
            return True
        except Exception as e:
            print(f"Error removing from assets: {e}")
            return False
    
    def close(self):
        """关闭数据库连接"""
        if self.connection:
            self.connection.close()
            print("✓ Database connection closed")
