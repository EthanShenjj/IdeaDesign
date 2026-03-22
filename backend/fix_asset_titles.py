"""
修复数据库中已保存的 asset 标题
从 analysis.prompt.style_name 提取正确的标题
"""

import sys
import json
from database import get_database_manager

def fix_asset_titles():
    """修复所有 asset 的标题"""
    db = get_database_manager()
    
    if not db.connection:
        print("❌ 数据库连接失败")
        return
    
    try:
        # 获取所有 assets
        assets = db.get_assets(limit=1000)
        print(f"📊 找到 {len(assets)} 个 assets")
        
        fixed_count = 0
        skipped_count = 0
        
        for asset in assets:
            asset_id = asset['id']
            current_title = asset['title']
            analysis = asset.get('analysis', {})
            
            # 尝试从 analysis 中提取正确的标题
            new_title = None
            
            # 优先级 1: analysis.prompt.style_name
            if isinstance(analysis, dict):
                prompt_data = analysis.get('prompt', {})
                if isinstance(prompt_data, dict):
                    new_title = prompt_data.get('style_name')
                
                # 优先级 2: analysis.parsed.style_name
                if not new_title:
                    parsed_data = analysis.get('parsed', {})
                    if isinstance(parsed_data, dict):
                        new_title = parsed_data.get('style_name') or parsed_data.get('project_name')
            
            # 如果找到了新标题且与当前标题不同
            if new_title and new_title.strip() and new_title != current_title:
                # 检查是否是时间戳格式的标题（需要替换）
                if current_title.startswith('Analysis ') or '/' in current_title:
                    print(f"🔄 修复 Asset #{asset_id}:")
                    print(f"   旧标题: {current_title}")
                    print(f"   新标题: {new_title}")
                    
                    # 更新数据库（根据数据库类型使用不同的占位符）
                    cursor = db.connection.cursor()
                    
                    # 检测数据库类型
                    db_type = getattr(db, 'db_type', 'sqlite')
                    if db_type == 'sqlite' or hasattr(db.connection, 'execute'):
                        # SQLite 使用 ? 占位符
                        cursor.execute(
                            "UPDATE assets SET title = ? WHERE id = ?",
                            (new_title.strip(), asset_id)
                        )
                    else:
                        # MySQL/PostgreSQL 使用 %s 占位符
                        cursor.execute(
                            "UPDATE assets SET title = %s WHERE id = %s",
                            (new_title.strip(), asset_id)
                        )
                    
                    db.connection.commit()
                    cursor.close()
                    
                    fixed_count += 1
                else:
                    print(f"⏭️  跳过 Asset #{asset_id} (标题已是自定义: {current_title})")
                    skipped_count += 1
            else:
                if not new_title:
                    print(f"⚠️  Asset #{asset_id} 没有找到 style_name (标题: {current_title})")
                skipped_count += 1
        
        print(f"\n✅ 完成!")
        print(f"   修复: {fixed_count} 个")
        print(f"   跳过: {skipped_count} 个")
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == '__main__':
    print("=" * 60)
    print("修复 Asset 标题工具")
    print("=" * 60)
    print()
    
    confirm = input("⚠️  这将修改数据库中的数据。是否继续? (y/N): ")
    if confirm.lower() == 'y':
        fix_asset_titles()
    else:
        print("❌ 已取消")
