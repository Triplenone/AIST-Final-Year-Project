"""
数据接收API路由
接收智能设备上传的传感器数据并存储到数据库
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import datetime
import time
import json
from app.database import get_db
from app.schemas.device_data_log import DeviceDataLogCreate
from app import crud

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
    
    输入数据格式（支持完整格式和简化格式）:
    
    完整格式:
    {
        "device_id": int,
        "timestamp": int (Unix时间戳),
        "relative_time": int,
        "accelerometer": {"x": float, "y": float, "z": float},
        "gyroscope": {"x": float, "y": float, "z": float},
        "location": {"x": float, "y": float, "z": float, "accuracy": float, "position_quality": str},
        "fall_detection": {...},
        "system_status": {...}
    }
    
    简化格式（仅包含必需字段）:
    {
        "device_id": int,
        "relative_time": int,
        "accelerometer": {"x": float, "y": float, "z": float},
        "gyroscope": {"x": float, "y": float, "z": float}
    }
    """
    try:
        # 提取数据，提供默认值以支持简化格式
        accel = data.get('accelerometer', {})
        if not accel and 'accel_x' in data:
            # 支持扁平格式
            accel = {
                'x': data.get('accel_x', 0.0),
                'y': data.get('accel_y', 0.0),
                'z': data.get('accel_z', 0.0)
            }
        
        gyro = data.get('gyroscope', {})
        if not gyro and 'gyro_x' in data:
            # 支持扁平格式
            gyro = {
                'x': data.get('gyro_x', 0.0),
                'y': data.get('gyro_y', 0.0),
                'z': data.get('gyro_z', 0.0)
            }
        
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
        
        # 使用服务器当前时间作为 timestamp，保证排序与显示一致（不采用设备端时间，避免设备时钟不准导致乱序）
        timestamp = int(time.time())
        
        relative_time = data.get('relative_time')
        if relative_time is None:
            relative_time = timestamp
        else:
            relative_time = int(relative_time)
        
        # 构建DeviceDataLogCreate对象
        return DeviceDataLogCreate(
            device_id=int(data.get('device_id', 0)),
            timestamp=timestamp,
            relative_time=relative_time,
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
async def receive_imu_data(
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
        
        # 上行原始 JSON 写入 MongoDB 缓存（与 MySQL 并行，失败不影响主流程）
        try:
            from app.services.mongo_raw_upstream import save_raw_upstream
            await save_raw_upstream(data)
        except Exception as e:
            print(f"⚠️ MongoDB 写入上行缓存失败: {e}")
        
        # 转换数据格式
        log_data = convert_imu_data_to_device_data_log(data)
        
        # 保存到数据库（确认跌倒时在 1 分钟内同一设备只创建一次事件，避免 ESP 重复上报）
        new_log, event_created = crud.device_data_log.create_device_data_log(db, log_data)
        
        # 更新接收统计
        _reception_stats["total_received"] += 1
        _reception_stats["last_receive_time"] = datetime.now().isoformat()
        _reception_stats["last_log_id"] = new_log.id
        
        # 构建返回信息（event_created 表示本次是否新建了跌倒事件）
        result = {
            "status": "success",
            "message": "数据接收成功",
            "log_id": new_log.id,
            "server_time": data.get('server_receive_time', ''),
            "is_fall_confirmed": log_data.is_fall_confirmed,
            "event_created": event_created
        }
        
        if event_created:
            result["message"] = "数据接收成功，已自动创建待处理事件"
            print("💾 数据保存:")
            print(f"   ✅ 已保存到数据库 (日志ID: {new_log.id})")
            print(f"   🚨 跌倒警报: 已自动创建待处理事件")
        elif log_data.is_fall_confirmed:
            print("💾 数据保存:")
            print(f"   ✅ 已保存到数据库 (日志ID: {new_log.id})")
            print(f"   ⏭️ 跌倒已确认，1 分钟内已存在该设备跌倒事件，未重复创建")
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


@router.get("/status")
def get_reception_status():
    """
    获取数据接收服务状态和统计信息
    """
    from app.services.tcp_server import get_tcp_server
    
    tcp_server = get_tcp_server()
    tcp_status = tcp_server.get_status()
    is_tcp_running = tcp_status["is_running"]

    # 參考 Python 程式：TCP 運行時接收數來自 TCP 服務（TCP 路徑不寫入 _reception_stats），
    # 前端與下方「接收總數/錯誤」統一使用 stats，故在此合併
    if is_tcp_running:
        stats_total = tcp_status["total_samples"]
        stats_errors = tcp_status["errors"]
        stats_last = tcp_status["last_receive_time"] or _reception_stats["last_receive_time"]
    else:
        stats_total = _reception_stats["total_received"]
        stats_errors = _reception_stats["errors"]
        stats_last = _reception_stats["last_receive_time"]

    return {
        "status": "running",
        "service": "data_reception",
        "description": "数据接收服务正在运行",
        "endpoint": "/api/v1/data-reception/receive",
        "method": "POST",
        "tcp_server": {
            "is_running": is_tcp_running,
            "host": tcp_status["host"],
            "port": tcp_status["port"],
            "total_samples": tcp_status["total_samples"],
            "errors": tcp_status["errors"],
            "last_receive_time": tcp_status["last_receive_time"],
            "active_client_count": tcp_status.get("active_client_count", 0),
        },
        "stats": {
            "total_received": stats_total,
            "last_receive_time": stats_last,
            "errors": stats_errors,
            "last_log_id": _reception_stats["last_log_id"]
        }
    }


@router.get("/mqtt/status")
def get_mqtt_status():
    """
    获取 MQTT 订阅状态（与 MQTT-topic.txt 上行主题一致）。
    用于确认是否已连接 Broker、当前订阅的 8 个上行主题。
    """
    try:
        from app.services.mqtt_subscriber import get_mqtt_status as _get
        return _get()
    except Exception as e:
        return {"enabled": False, "connected": False, "error": str(e), "subscribed_topics": []}


@router.post("/tcp/start")
def start_tcp_server(
    host: Optional[str] = Query("0.0.0.0", description="服务器监听地址"),
    port: Optional[int] = Query(8080, description="服务器监听端口")
):
    """
    启动TCP服务器接收ESP32数据
    
    Args:
        host: 服务器监听地址，默认 0.0.0.0
        port: 服务器监听端口，默认 8080
    """
    from app.services.tcp_server import get_tcp_server
    
    try:
        tcp_server = get_tcp_server(host=host or "0.0.0.0", port=port or 8080)
        result = tcp_server.start()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动TCP服务器失败: {str(e)}")


@router.post("/tcp/stop")
def stop_tcp_server():
    """
    停止TCP服务器
    """
    from app.services.tcp_server import get_tcp_server
    
    try:
        tcp_server = get_tcp_server()
        result = tcp_server.stop()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"停止TCP服务器失败: {str(e)}")


@router.get("/tcp/status")
def get_tcp_server_status():
    """
    获取TCP服务器状态
    """
    from app.services.tcp_server import get_tcp_server
    
    try:
        tcp_server = get_tcp_server()
        status = tcp_server.get_status()
        return {
            "status": "success",
            "data": status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取TCP服务器状态失败: {str(e)}")

