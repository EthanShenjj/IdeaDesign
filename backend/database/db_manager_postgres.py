"""
数据库管理模块 - PostgreSQL (适用于 Vercel Postgres, Supabase, Neon 等)
"""

import json
from datetime import datetime
from typing import List, Dict, Optional
import os

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    POSTGRES_AVAILABLE = True
except ImportError:
    POSTGRES_AVAILABLE = False
    print("⚠️  psycopg2 not installed. Run: pip install psycopg2-binary")


class DatabaseManager:
    """PostgreSQL 数据库管理器 - 适用于 Vercel 部署"""
    
    def __init__(self):
        """初始化数据库连接"""
        if not POSTGRES_AVAILABLE:
            raise Exception("psycopg2 is required for PostgreSQL. Install it with: pip install psycopg2-binary")
        
        self.connection = None
        self.db_type = 'postgresql'
        self.connect()
        self.create_tables()
    
    def connect(self):
        """建立 PostgreSQL 数据库连接"""
        try:
            # 支持多种环境变量名称
            database_url = (
                os.getenv('POSTGRES_URL') or 
                os.getenv('DATABASE_URL') or 
                os.getenv('SUPABASE_DB_URL')
            )
            
            if not database_url:
                raise Exception(
                    "Database URL not found. Set one of: "
                    "POSTGRES_URL, DATABASE_URL, or SUPABASE_DB_URL"
                )
            
            self.connection = psycopg2.connect(
                database_url,
                cursor_factory=RealDictCursor
            )
            
            print(f"✓ PostgreSQL database connected")
        
        except Exception as e:
            print(f"✗ Error connecting to PostgreSQL: {e}")
            raise
    
    def create_tables(self):
        """创建数据表"""
        if not self.connection:
            return
        
        try:
            cursor = self.connection.cursor()
            
            # 素材表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS assets (
                    id SERIAL PRIMARY KEY,
                    history_id INTEGER,
                    title VARCHAR(255) NOT NULL,
                    image_url TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    colors JSONB NOT NULL,
                    tags JSONB,
                    analysis JSONB,
                    is_saved INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 标签表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tags (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) UNIQUE NOT NULL,
                    count INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 创建索引
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_assets_title 
                ON assets(title)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_assets_created 
                ON assets(created_at DESC)
            """)
            
            # JSONB 索引（提高 JSON 查询性能）
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_assets_tags 
                ON assets USING GIN (tags)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_assets_colors 
                ON assets USING GIN (colors)
            """)
            
            self.connection.commit()
            cursor.close()
            print("✓ Database tables created")
        
        except Exception as e:
            print(f"✗ Error creating tables: {e}")
            self.connection.rollback()
    
    def save_asset(
        self,
        title: str,
        image_url: str,
        prompt: str,
        colors: List[Dict],
        tags: List[str] = None,
        analysis: Dict = None
    ) -> int:
        """保存素材到数据库"""
        if not self.connection:
            raise Exception("Database not connected")
        
        try:
            cursor = self.connection.cursor()
            
            query = """
                INSERT INTO assets (title, image_url, prompt, colors, tags, analysis)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
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
            asset_id = cursor.fetchone()['id']
            self.connection.commit()
            
            # 更新标签计数
            if tags:
                self._update_tags(tags)
            
            cursor.close()
            return asset_id
        
        except Exception as e:
            self.connection.rollback()
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
            
            query = "SELECT * FROM assets WHERE 1=1"
            params = []
            
            # 关键词搜索
            if search:
                query += " AND (title ILIKE %s OR prompt ILIKE %s)"
                search_pattern = f"%{search}%"
                params.extend([search_pattern, search_pattern])
            
            # 标签筛选（使用 JSONB 操作符）
            if tag:
                query += " AND tags @> %s"
                params.append(json.dumps([tag]))
            
            # 颜色筛选（使用 JSONB 操作符）
            if color:
                query += " AND colors::text ILIKE %s"
                params.append(f"%{color}%")
            
            query += " ORDER BY created_at DESC LIMIT %s"
            params.append(limit)
            
            cursor.execute(query, params)
            assets = cursor.fetchall()
            
            # 转换为字典列表
            result = []
            for asset in assets:
                asset_dict = dict(asset)
                # 时间戳转换为 ISO 格式
                if asset_dict.get('created_at'):
                    asset_dict['created_at'] = asset_dict['created_at'].isoformat()
                if asset_dict.get('updated_at'):
                    asset_dict['updated_at'] = asset_dict['updated_at'].isoformat()
                result.append(asset_dict)
            
            cursor.close()
            return result
        
        except Exception as e:
            print(f"Error fetching assets: {e}")
            return []
    
    def get_asset_by_id(self, asset_id: int) -> Optional[Dict]:
        """根据 ID 获取单个素材"""
        if not self.connection:
            return None
        
        try:
            cursor = self.connection.cursor()
            cursor.execute("SELECT * FROM assets WHERE id = %s", (asset_id,))
            asset = cursor.fetchone()
            
            if asset:
                asset_dict = dict(asset)
                # 时间戳转换为 ISO 格式
                if asset_dict.get('created_at'):
                    if hasattr(asset_dict['created_at'], 'isoformat'):
                        asset_dict['created_at'] = asset_dict['created_at'].isoformat()
                if asset_dict.get('updated_at'):
                    if hasattr(asset_dict['updated_at'], 'isoformat'):
                        asset_dict['updated_at'] = asset_dict['updated_at'].isoformat()
                cursor.close()
                return asset_dict
            
            cursor.close()
            return None
        
        except Exception as e:
            print(f"Error fetching asset by id: {e}")
            return None

    def save_history(
        self,
        title: str,
        image_url: str,
        prompt: str,
        colors: List[Dict],
        tags: List[str] = None,
        analysis: Dict = None
    ) -> int:
        """保存历史记录"""
        return self.save_asset(title, image_url, prompt, colors, tags, analysis)

    def get_history(
        self,
        tag: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict]:
        """获取历史记录列表"""
        return self.get_assets(tag=tag, search=search, limit=limit)

    def get_history_by_id(self, history_id: int) -> Optional[Dict]:
        """根据 ID 获取历史记录"""
        return self.get_asset_by_id(history_id)

    def save_history_to_assets(self, history_id: int) -> int:
        """保存到收藏"""
        if not self.connection:
            return history_id
        try:
            cursor = self.connection.cursor()
            cursor.execute("UPDATE assets SET is_saved = 1, updated_at = CURRENT_TIMESTAMP WHERE id = %s", (history_id,))
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
            cursor.execute("UPDATE assets SET is_saved = 0, updated_at = CURRENT_TIMESTAMP WHERE id = %s", (history_id,))
            self.connection.commit()
            cursor.close()
            return True
        except Exception as e:
            print(f"Error removing from assets: {e}")
            return False
    
    def delete_asset(self, asset_id: int) -> bool:
        """删除素材"""
        if not self.connection:
            return False
        
        try:
            cursor = self.connection.cursor()
            cursor.execute("DELETE FROM assets WHERE id = %s", (asset_id,))
            self.connection.commit()
            cursor.close()
            return True
        
        except Exception as e:
            print(f"Error deleting asset: {e}")
            self.connection.rollback()
            return False
    
    def delete_history(self, history_id: int) -> bool:
        """删除历史记录"""
        if not self.connection:
            return False
        
        try:
            cursor = self.connection.cursor()
            cursor.execute("DELETE FROM history WHERE id = %s", (history_id,))
            self.connection.commit()
            cursor.close()
            return True
        
        except Exception as e:
            print(f"Error deleting history: {e}")
            self.connection.rollback()
            return False
    
    def _update_tags(self, tags: List[str]):
        """更新标签计数"""
        if not self.connection:
            return
        
        try:
            cursor = self.connection.cursor()
            
            for tag in tags:
                cursor.execute("""
                    INSERT INTO tags (name, count)
                    VALUES (%s, 1)
                    ON CONFLICT (name) 
                    DO UPDATE SET count = tags.count + 1
                """, (tag,))
            
            self.connection.commit()
            cursor.close()
        
        except Exception as e:
            print(f"Error updating tags: {e}")
            self.connection.rollback()
    
    def get_popular_tags(self, limit: int = 20) -> List[Dict]:
        """获取热门标签"""
        if not self.connection:
            return []
        
        try:
            cursor = self.connection.cursor()
            cursor.execute("""
                SELECT name, count FROM tags
                ORDER BY count DESC
                LIMIT %s
            """, (limit,))
            
            tags = cursor.fetchall()
            cursor.close()
            return [dict(tag) for tag in tags]
        
        except Exception as e:
            print(f"Error fetching tags: {e}")
            return []
    
    def close(self):
        """关闭数据库连接"""
        if self.connection:
            self.connection.close()
            print("✓ PostgreSQL connection closed")
