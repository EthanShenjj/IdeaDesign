"""
数据库管理模块
根据环境变量自动选择合适的数据库管理器
"""

import os

def get_database_manager():
    """
    根据环境变量自动选择数据库管理器
    
    优先级:
    1. PostgreSQL (如果设置了 POSTGRES_URL 或 DATABASE_URL)
    2. MySQL (如果设置了 DB_HOST 和 DB_USER)
    3. SQLite (默认)
    """
    
    # 检查 PostgreSQL
    if os.getenv('POSTGRES_URL') or os.getenv('DATABASE_URL') or os.getenv('SUPABASE_DB_URL'):
        try:
            from .db_manager_postgres import DatabaseManager
            print("📊 Using PostgreSQL database")
            return DatabaseManager()
        except ImportError as e:
            print(f"⚠️  PostgreSQL driver not available: {e}")
            print("   Install with: pip install psycopg2-binary")
    
    # 检查 MySQL
    if os.getenv('DB_HOST') and os.getenv('DB_USER'):
        try:
            from .db_manager import DatabaseManager
            print("📊 Using MySQL database")
            return DatabaseManager()
        except ImportError as e:
            print(f"⚠️  MySQL driver not available: {e}")
            print("   Install with: pip install mysql-connector-python")
    
    # 默认使用 SQLite
    from .db_manager_v2 import DatabaseManager
    print("📊 Using SQLite database (default)")
    return DatabaseManager()


# 导出统一接口
DatabaseManager = get_database_manager
