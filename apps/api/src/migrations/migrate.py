#!/usr/bin/env python3
"""
数据库迁移脚本
用于初始化和更新数据库结构
"""

import os
import sys
import asyncio
from pathlib import Path

import asyncpg

# 添加父目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import settings


async def run_migration():
    """执行数据库迁移"""
    print("🚀 开始数据库迁移...")
    print(f"🔧 Debug: Using DB URL: {settings.database_url}")
    
    # 连接数据库
    try:
        conn = await asyncpg.connect(settings.database_url.replace('postgresql+asyncpg://', 'postgresql://'))
        print("✅ 数据库连接成功")
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return False
    
    try:
        # 读取迁移脚本
        migration_file = Path(__file__).parent / "init.sql"
        if not migration_file.exists():
            print(f"❌ 迁移文件不存在: {migration_file}")
            return False
        
        sql = migration_file.read_text(encoding="utf-8")
        print(f"📄 读取迁移脚本: {migration_file}")
        
        # 执行迁移
        await conn.execute(sql)
        print("✅ 数据库迁移完成")
        
        # 验证表是否创建成功
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        print(f"\n📊 已创建的表 ({len(tables)} 个):")
        for table in tables:
            print(f"   - {table['table_name']}")
        
        return True
        
    except Exception as e:
        print(f"❌ 迁移执行失败: {e}")
        return False
        
    finally:
        await conn.close()


async def check_connection():
    """检查数据库连接"""
    try:
        conn = await asyncpg.connect(settings.database_url.replace('postgresql+asyncpg://', 'postgresql://'))
        version = await conn.fetchval("SELECT version()")
        print(f"✅ PostgreSQL 版本: {version}")
        await conn.close()
        return True
    except Exception as e:
        print(f"❌ 连接检查失败: {e}")
        return False


async def main():
    """主函数"""
    print("=" * 50)
    print("Zmage 数据库迁移工具")
    print("=" * 50)
    print(f"\n数据库 URL: {settings.database_url.replace('postgresql+asyncpg://', 'postgresql://').split('@')[1] if '@' in settings.database_url.replace('postgresql+asyncpg://', 'postgresql://') else settings.database_url.replace('postgresql+asyncpg://', 'postgresql://')}")
    
    # 检查连接
    if not await check_connection():
        print("\n请确保 PostgreSQL 服务正在运行，并且连接配置正确。")
        sys.exit(1)
    
    # 执行迁移
    success = await run_migration()
    
    if success:
        print("\n🎉 迁移成功完成！")
    else:
        print("\n💥 迁移失败，请检查错误信息。")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
