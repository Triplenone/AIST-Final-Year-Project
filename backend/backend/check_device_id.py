"""
诊断工具：检查设备ID是否存在
用于排查ESP32数据接收错误

使用方法：
直接运行（会自动使用虚拟环境）：
    ..\venv\Scripts\python.exe check_device_id.py
"""
import sys
import os

# 添加项目路径到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app.database import SessionLocal
    from app.models.device import Device
except ImportError as e:
    print("[错误] 导入错误:", e)
    print("\n请确保：")
    print("   1. 已激活虚拟环境（venv）")
    print("   2. 已安装所有依赖：pip install -r requirements.txt")
    print("   3. 在 backend/backend 目录下运行此脚本")
    print("\n正确运行方式：")
    print("   ..\\venv\\Scripts\\python.exe check_device_id.py")
    sys.exit(1)

def check_device_exists(device_id: int):
    """检查设备是否存在"""
    db = SessionLocal()
    try:
        device = db.query(Device).filter(Device.device_id == device_id).first()
        if device:
            print(f"[OK] 设备ID {device_id} 存在")
            print(f"   设备类型: {device.device_type}")
            print(f"   设备描述: {device.model_desc}")
            # 检查设备状态字段（可能是current_status）
            if hasattr(device, 'current_status'):
                print(f"   设备状态: {device.current_status}")
            elif hasattr(device, 'status'):
                print(f"   设备状态: {device.status}")
            return True
        else:
            print(f"[X] 设备ID {device_id} 不存在")
            return False
    except Exception as e:
        print(f"[错误] 查询设备时出错: {e}")
        return False
    finally:
        db.close()

def list_all_devices():
    """列出所有设备"""
    db = SessionLocal()
    try:
        devices = db.query(Device).all()
        print(f"\n数据库中的所有设备 (共 {len(devices)} 个):")
        print("-" * 60)
        if len(devices) == 0:
            print("  [警告] 数据库中没有设备记录")
            print("  提示：请先在数据库中创建设备")
        else:
            for device in devices:
                print(f"  ID: {device.device_id}, 类型: {device.device_type}, 描述: {device.model_desc}")
        print("-" * 60)
        return [d.device_id for d in devices]
    except Exception as e:
        print(f"[错误] 查询设备列表时出错: {e}")
        return []
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("设备ID诊断工具")
    print("=" * 60)
    print("\n[重要] 请确保已激活虚拟环境！")
    print("   如果使用系统Python运行，请使用：")
    print("   ..\\venv\\Scripts\\python.exe check_device_id.py")
    print("=" * 60)
    
    try:
        # 列出所有设备
        device_ids = list_all_devices()
        
        # 检查常用设备ID
        print("\n检查常用设备ID:")
        for device_id in [1, 2, 3]:
            check_device_exists(device_id)
        
        print("\n[提示] 如果ESP32使用的设备ID不在列表中，请：")
        print("   1. 在数据库中创建对应的设备记录")
        print("   2. 或修改ESP32代码使用已存在的设备ID")
    except Exception as e:
        print(f"\n[错误] 运行错误: {e}")
        print("\n请检查：")
        print("   1. 是否已激活虚拟环境")
        print("   2. 数据库连接是否正常")
        print("   3. 是否在 backend/backend 目录下运行")
        import traceback
        traceback.print_exc()

