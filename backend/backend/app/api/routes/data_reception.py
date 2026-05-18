"""
数据接收API路由
接收智能设备上传的传感器数据并存储到数据库
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
from datetime import datetime
from app.database import get_db
from app.schemas.device_data_log import DeviceDataLogCreate
from app import crud
import json

router = APIRouter()

# 接收统计（内存中，用于实时显示）
_reception_stats = {
    "total_received": 0,
    "last_receive_time": None,
    "errors": 0,
    "last_log_id": None
}


def convert_imu_data_to_device_data_log(data: Dict[str, Any]) -> DeviceDataLogCreate:
    """
    将IMU设备上传的JSON数据转换为DeviceDataLogCreate格式
    
    输入数据格式（来自IMU_wifi.py）:
    {
        "device_id": int,
        "timestamp": int (Unix时间戳),
        "relative_time": int,
        "accelerometer": {"x": float, "y": float, "z": float},
        "gyroscope": {"x": float, "y": float, "z": float},
        "location": {"x": float, "y": float, "z": float, "accuracy": float, "position_quality": str},
        "fall_detection": {
            "state": int,
            "state_description": str,
            "confidence": float (0-1),
            "is_fall_confirmed": bool,
            "impact_force": float,
            "direction": str,
            "fall_time": int
        },
        "system_status": {
            "wifi_connected": bool,
            "server_connected": bool,
            "battery_level": int (0-100)
        },
        "server_receive_time": str (datetime格式)
    }
    """
    try:
        # 提取数据
        accel = data.get('accelerometer', {})
        gyro = data.get('gyroscope', {})
        location = data.get('location', {})
        fall_detection = data.get('fall_detection', {})
        system_status = data.get('system_status', {})
        
        # 处理服务器接收时间
        server_receive_time_str = data.get('server_receive_time', '')
        if server_receive_time_str:
            try:
                # 尝试解析时间字符串 (格式: "YYYY-MM-DD HH:MM:SS.mmm")
                if '.' in server_receive_time_str:
                    server_receive_time = datetime.strptime(server_receive_time_str, "%Y-%m-%d %H:%M:%S.%f")
                else:
                    server_receive_time = datetime.strptime(server_receive_time_str, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                server_receive_time = datetime.now()
        else:
            server_receive_time = datetime.now()
        
        # 构建DeviceDataLogCreate对象
        return DeviceDataLogCreate(
            device_id=int(data.get('device_id', 0)),
            timestamp=int(data.get('timestamp', 0)),
            relative_time=int(data.get('relative_time', 0)),
            # 加速度计数据
            accel_x=float(accel.get('x', 0.0)),
            accel_y=float(accel.get('y', 0.0)),
            accel_z=float(accel.get('z', 0.0)),
            # 陀螺仪数据
            gyro_x=float(gyro.get('x', 0.0)),
            gyro_y=float(gyro.get('y', 0.0)),
            gyro_z=float(gyro.get('z', 0.0)),
            # 位置数据
            loc_x=float(location.get('x', 0.0)),
            loc_y=float(location.get('y', 0.0)),
            loc_z=float(location.get('z', 0.0)),
            loc_accuracy=float(location.get('accuracy', 999.0)),
            position_quality=str(location.get('position_quality', 'unknown')),
            # 跌倒检测数据
            fall_state=int(fall_detection.get('state', 0)),
            fall_state_description=str(fall_detection.get('state_description', '正常')),
            fall_confidence=float(fall_detection.get('confidence', 0.0)),
            is_fall_confirmed=bool(fall_detection.get('is_fall_confirmed', False)),
            impact_force=float(fall_detection.get('impact_force', 0.0)),
            fall_direction=str(fall_detection.get('direction', '')),
            fall_time=int(fall_detection.get('fall_time', 0)),
            # 连接状态
            wifi_connected=bool(system_status.get('wifi_connected', False)),
            server_connected=bool(system_status.get('server_connected', False)),
            battery_level=int(system_status.get('battery_level', 0)),
            # 时间戳
            server_receive_time=server_receive_time
        )
    except Exception as e:
        raise ValueError(f"数据格式转换失败: {str(e)}")


def display_data_info(data: Dict[str, Any]):
    """在控制台显示接收到的数据信息（类似IMU_wifi.py）"""
    print("\n" + "="*80)
    print("🕐 收到IMU设备数据 - 时间:", data.get('server_receive_time', ''))
    print("📱 设备ID:", data.get('device_id', '未知'))
    
    # 六轴数据
    print("📊 六轴传感器数据:")
    accel = data.get('accelerometer', {})
    gyro = data.get('gyroscope', {})
    print(f"   加速度: X={accel.get('x', 0):.3f}, Y={accel.get('y', 0):.3f}, Z={accel.get('z', 0):.3f} g")
    print(f"   陀螺仪: X={gyro.get('x', 0):.3f}, Y={gyro.get('y', 0):.3f}, Z={gyro.get('z', 0):.3f} °/s")
    
    # 定位数据
    location = data.get('location', {})
    print("📍 定位数据:")
    print(f"   位置: X={location.get('x', 0):.2f}m, Y={location.get('y', 0):.2f}m")
    print(f"   精度: {location.get('accuracy', 999):.2f}m")
    print(f"   质量: {location.get('position_quality', 'unknown')}")
    
    # 跌倒检测数据
    fall_detection = data.get('fall_detection', {})
    print("🚨 跌倒检测状态:")
    state_desc = fall_detection.get('state_description', '正常')
    confidence = fall_detection.get('confidence', 0) * 100
    is_fall = fall_detection.get('is_fall_confirmed', False)
    
    if is_fall:
        print(f"   ⚠️ 状态: {state_desc} (确认跌倒!)")
        print(f"   💥 冲击力: {fall_detection.get('impact_force', 0):.2f} g")
        print(f"   🧭 方向: {fall_detection.get('direction', '未知')}")
        print(f"   ⏰ 跌倒时间: {fall_detection.get('fall_time', 0)} ms")
    else:
        print(f"   ✅ 状态: {state_desc}")
        print(f"   📈 置信度: {confidence:.1f}%")
    
    # 系统状态
    system_status = data.get('system_status', {})
    print("🔧 系统状态:")
    print(f"   WiFi: {'已连接' if system_status.get('wifi_connected', False) else '断开'}")
    print(f"   服务器: {'已连接' if system_status.get('server_connected', False) else '断开'}")
    print(f"   电量: {system_status.get('battery_level', 0)}%")
    print(f"📦 数据包大小: {len(json.dumps(data))} 字节")


@router.post("/receive", status_code=200)
def receive_imu_data(
    data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    接收智能设备上传的IMU传感器数据
    
    接收JSON格式的数据，自动转换为device_data_log格式并保存到数据库。
    如果is_fall_confirmed为True，系统会自动创建待处理事件。
    
    此接口用于接收外部IMU设备（如智能手表）通过WiFi发送的数据。
    
    **数据格式示例**:
    ```json
    {
        "device_id": 1,
        "timestamp": 1735123456,
        "relative_time": 1735123456,
        "accelerometer": {"x": 0.123, "y": -0.046, "z": 1.023},
        "gyroscope": {"x": 1.254, "y": -0.754, "z": 0.325},
        "location": {"x": 2.35, "y": 3.67, "z": 0, "accuracy": 1.25, "position_quality": "medium"},
        "fall_detection": {
            "state": 4,
            "state_description": "确认跌倒",
            "confidence": 0.95,
            "is_fall_confirmed": true,
            "impact_force": 6.80,
            "direction": "前",
            "fall_time": 1735123456
        },
        "system_status": {
            "wifi_connected": true,
            "server_connected": true,
            "battery_level": 85
        }
    }
    ```
    """
    global _reception_stats
    
    try:
        # 添加服务器接收时间（如果数据中没有）
        if 'server_receive_time' not in data:
            data['server_receive_time'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        
        # 在控制台显示数据（类似IMU_wifi.py）
        display_data_info(data)
        
        # 转换数据格式
        log_data = convert_imu_data_to_device_data_log(data)
        
        # 保存到数据库（会自动创建事件如果is_fall_confirmed=True）
        new_log = crud.device_data_log.create_device_data_log(db, log_data)
        
        # 更新接收统计
        _reception_stats["total_received"] += 1
        _reception_stats["last_receive_time"] = datetime.now().isoformat()
        _reception_stats["last_log_id"] = new_log.id
        
        # 构建返回信息
        result = {
            "status": "success",
            "message": "数据接收成功",
            "log_id": new_log.id,
            "server_time": data.get('server_receive_time', ''),
            "is_fall_confirmed": log_data.is_fall_confirmed,
            "event_created": False
        }
        
        # 如果确认跌倒，提示事件已创建
        if log_data.is_fall_confirmed:
            result["event_created"] = True
            result["message"] = "数据接收成功，已自动创建待处理事件"
            print("💾 数据保存:")
            print(f"   ✅ 已保存到数据库 (日志ID: {new_log.id})")
            print(f"   🚨 跌倒警报: 已自动创建待处理事件")
        else:
            print("💾 数据保存:")
            print(f"   ✅ 已保存到数据库 (日志ID: {new_log.id})")
        
        print(f"📋 总接收数据量: {_reception_stats['total_received']} 条")
        print("="*80)
        
        return result
        
    except ValueError as e:
        _reception_stats["errors"] += 1
        print(f"❌ 数据格式错误: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        _reception_stats["errors"] += 1
        import traceback
        error_detail = traceback.format_exc()
        print(f"❌ 处理数据时出错: {e}")
        print(f"错误详情: {error_detail}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


@router.get("/mqtt/status")
def get_mqtt_status():
    """MQTT 订阅状态（航班主题 flycare/flight 等）。"""
    from app.services.mqtt_subscriber import get_mqtt_status as _mqtt_status

    return _mqtt_status()


@router.get("/status")
def get_reception_status():
    """
    获取数据接收服务状态和统计信息
    """
    return {
        "status": "running",
        "service": "data_reception",
        "description": "数据接收服务正在运行",
        "endpoint": "/api/v1/data-reception/receive",
        "method": "POST",
        "stats": {
            "total_received": _reception_stats["total_received"],
            "last_receive_time": _reception_stats["last_receive_time"],
            "errors": _reception_stats["errors"],
            "last_log_id": _reception_stats["last_log_id"]
        }
    }

