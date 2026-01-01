"""
Zmage Worker 主程序
定时任务调度器
"""
import asyncio
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

from src.config import settings
from src.tasks import album_suggestion_task, cleanup_task


def create_scheduler() -> AsyncIOScheduler:
    """创建调度器"""
    scheduler = AsyncIOScheduler()
    
    # 相册建议任务 - 每 6 小时执行一次
    scheduler.add_job(
        album_suggestion_task,
        trigger=IntervalTrigger(hours=settings.album_scan_interval_hours),
        id="album_suggestion",
        name="相册建议生成",
        replace_existing=True,
    )
    
    # 清理任务 - 每天凌晨 3 点执行
    scheduler.add_job(
        cleanup_task,
        trigger=CronTrigger(hour=3, minute=0),
        id="cleanup",
        name="清理过期数据",
        replace_existing=True,
    )
    
    return scheduler


async def main():
    """主函数"""
    print("DEBUG: Entering main()")
    print("=" * 50)
    print("Zmage Worker 启动")
    print(f"时间: {datetime.now().isoformat()}")
    print("=" * 50)
    
    print("DEBUG: Creating scheduler...")
    scheduler = create_scheduler()
    print("DEBUG: Starting scheduler...")
    scheduler.start()
    print("DEBUG: Scheduler started")
    
    print("\n已注册的定时任务:")
    for job in scheduler.get_jobs():
        print(f"  - {job.name} (ID: {job.id})")
        print(f"    下次执行: {job.next_run_time}")
    
    print("\nWorker 正在运行，按 Ctrl+C 停止...")
    
    try:
        # 启动时执行一次相册建议任务
        print("\n启动时执行相册建议任务...")
        await album_suggestion_task()
        
        # 保持运行
        while True:
            await asyncio.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        print("\n正在停止 Worker...")
        scheduler.shutdown()
        print("Worker 已停止")


if __name__ == "__main__":
    asyncio.run(main())
