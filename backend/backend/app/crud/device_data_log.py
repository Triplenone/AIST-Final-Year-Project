"""
设备数据日志CRUD操作
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import joinedload
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from app.models.device_data_log import DeviceDataLog
from app.models.device import Device
from app.models.user import User
from app.models.event import Event, EventType, EventStatus
from app.schemas.device_data_log import DeviceDataLogCreate, DeviceDataLogUpdate

# 同一设备在此时长内（秒）只根据跌倒确认的 device_data_log 生成一次跌倒事件，避免 ESP 重复上报产生重复事件（1 分钟内只触发一次）
FALL_EVENT_DEBOUNCE_SECONDS = 60


def get_device_data_log(db: Session, log_id: int) -> Optional[DeviceDataLog]:
    """根据ID获取设备数据日志"""
    return db.query(DeviceDataLog).options(
        joinedload(DeviceDataLog.device)
    ).filter(DeviceDataLog.id == log_id).first()


def get_device_data_logs(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    device_id: Optional[int] = None,
    is_fall_confirmed: Optional[bool] = None,
    position_quality: Optional[str] = None,
    start_timestamp: Optional[int] = None,
    end_timestamp: Optional[int] = None
) -> List[DeviceDataLog]:
    """获取设备数据日志列表"""
    query = db.query(DeviceDataLog).options(
        joinedload(DeviceDataLog.device)
    )
    
    # 应用筛选条件
    if device_id is not None:
        query = query.filter(DeviceDataLog.device_id == device_id)
    if is_fall_confirmed is not None:
        query = query.filter(DeviceDataLog.is_fall_confirmed == is_fall_confirmed)
    if position_quality is not None:
        query = query.filter(DeviceDataLog.position_quality == position_quality)
    if start_timestamp is not None:
        query = query.filter(DeviceDataLog.timestamp >= start_timestamp)
    if end_timestamp is not None:
        query = query.filter(DeviceDataLog.timestamp <= end_timestamp)
    
    # 按时间倒序排列
    query = query.order_by(DeviceDataLog.timestamp.desc())
    
    return query.offset(skip).limit(limit).all()


def get_latest_device_data_log(db: Session, device_id: int) -> Optional[DeviceDataLog]:
    """获取指定设备的最新数据日志"""
    return db.query(DeviceDataLog).options(
        joinedload(DeviceDataLog.device)
    ).filter(
        DeviceDataLog.device_id == device_id
    ).order_by(DeviceDataLog.timestamp.desc()).first()


def get_device_falls(
    db: Session,
    device_id: int,
    skip: int = 0,
    limit: int = 100
) -> List[DeviceDataLog]:
    """获取指定设备的跌倒记录"""
    return db.query(DeviceDataLog).options(
        joinedload(DeviceDataLog.device)
    ).filter(
        DeviceDataLog.device_id == device_id,
        DeviceDataLog.is_fall_confirmed == True
    ).order_by(DeviceDataLog.fall_time.desc()).offset(skip).limit(limit).all()


def create_device_data_log(db: Session, log_data: DeviceDataLogCreate) -> Tuple[DeviceDataLog, bool]:
    """创建设备数据日志。返回 (日志对象, 是否因本次日志创建了跌倒事件)。"""
    # 验证设备是否存在
    device = db.query(Device).filter(Device.device_id == log_data.device_id).first()
    if not device:
        raise ValueError("设备不存在")
    
    event_created = False
    # 创建新记录
    new_log = DeviceDataLog(
        device_id=log_data.device_id,
        timestamp=log_data.timestamp,
        relative_time=log_data.relative_time,
        accel_x=log_data.accel_x,
        accel_y=log_data.accel_y,
        accel_z=log_data.accel_z,
        gyro_x=log_data.gyro_x,
        gyro_y=log_data.gyro_y,
        gyro_z=log_data.gyro_z,
        loc_x=log_data.loc_x,
        loc_y=log_data.loc_y,
        loc_z=log_data.loc_z,
        loc_accuracy=log_data.loc_accuracy,
        position_quality=log_data.position_quality,
        fall_state=log_data.fall_state,
        fall_state_description=log_data.fall_state_description,
        fall_confidence=log_data.fall_confidence,
        is_fall_confirmed=log_data.is_fall_confirmed,
        impact_force=log_data.impact_force,
        fall_direction=log_data.fall_direction,
        fall_time=log_data.fall_time,
        wifi_connected=log_data.wifi_connected,
        server_connected=log_data.server_connected,
        battery_level=log_data.battery_level,
        server_receive_time=log_data.server_receive_time or datetime.now()
    )
    
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    db.refresh(new_log, ["device"])
    
    # 如果确认跌倒，在防抖时间窗内同一设备只生成一次跌倒事件（避免 ESP 重复上报产生重复事件）
    # 使用服务器时间作为 event_timestamp，否则设备传 fall_time=0 会得到 1970 年，防抖查询会漏掉刚创建的事件导致重复
    if log_data.is_fall_confirmed:
        elderly_user_id = device.elderly_user_id
        if elderly_user_id:
            now = datetime.now()
            cutoff = now - timedelta(seconds=FALL_EVENT_DEBOUNCE_SECONDS)
            recent_fall = (
                db.query(Event)
                .filter(
                    Event.event_type == EventType.FALL,
                    Event.trigger_device_id == log_data.device_id,
                    Event.event_timestamp >= cutoff,
                )
                .first()
            )
            if not recent_fall:
                event_params = {
                    "fall_state": log_data.fall_state,
                    "fall_state_description": log_data.fall_state_description,
                    "fall_confidence": float(log_data.fall_confidence) if log_data.fall_confidence else None,
                    "fall_direction": log_data.fall_direction,
                    "fall_time": log_data.fall_time,
                    "impact_force": float(log_data.impact_force) if log_data.impact_force else None,
                    "log_id": new_log.id
                }
                new_event = Event(
                    event_type=EventType.FALL,
                    related_user_id=elderly_user_id,
                    trigger_device_id=log_data.device_id,
                    location_zone_id=None,
                    event_timestamp=now,
                    event_params=event_params,
                    event_status=EventStatus.UNHANDLED,
                    handled_by=None,
                    handled_at=None,
                    remark=None
                )
                db.add(new_event)
                db.commit()
                db.refresh(new_event)
                event_created = True
    
    return new_log, event_created


def update_device_data_log(
    db: Session,
    log_id: int,
    log_data: DeviceDataLogUpdate
) -> Optional[DeviceDataLog]:
    """更新设备数据日志"""
    log = db.query(DeviceDataLog).filter(DeviceDataLog.id == log_id).first()
    if not log:
        return None
    
    update_data = log_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(log, field, value)
    
    db.commit()
    db.refresh(log)
    db.refresh(log, ["device"])
    return log


def delete_device_data_log(db: Session, log_id: int) -> bool:
    """删除设备数据日志"""
    log = db.query(DeviceDataLog).filter(DeviceDataLog.id == log_id).first()
    if not log:
        return False
    
    db.delete(log)
    db.commit()
    return True


def get_device_data_statistics(
    db: Session,
    device_id: Optional[int] = None,
    start_timestamp: Optional[int] = None,
    end_timestamp: Optional[int] = None
) -> Dict[str, Any]:
    """获取设备数据统计信息"""
    query = db.query(DeviceDataLog)
    
    if device_id is not None:
        query = query.filter(DeviceDataLog.device_id == device_id)
    if start_timestamp is not None:
        query = query.filter(DeviceDataLog.timestamp >= start_timestamp)
    if end_timestamp is not None:
        query = query.filter(DeviceDataLog.timestamp <= end_timestamp)
    
    # 总记录数
    total_count = query.count()
    
    # 跌倒相关统计
    fall_query = query.filter(DeviceDataLog.is_fall_confirmed == True)
    fall_count = fall_query.count()
    
    # 平均电池电量
    avg_battery = db.query(func.avg(DeviceDataLog.battery_level)).filter(
        DeviceDataLog.device_id == device_id if device_id else True,
        DeviceDataLog.timestamp >= start_timestamp if start_timestamp else True,
        DeviceDataLog.timestamp <= end_timestamp if end_timestamp else True
    ).scalar() or 0
    
    # 连接状态统计
    wifi_connected_count = query.filter(DeviceDataLog.wifi_connected == True).count()
    server_connected_count = query.filter(DeviceDataLog.server_connected == True).count()
    
    # 位置质量统计
    position_quality_stats = db.query(
        DeviceDataLog.position_quality,
        func.count(DeviceDataLog.id).label('count')
    ).filter(
        DeviceDataLog.device_id == device_id if device_id else True,
        DeviceDataLog.timestamp >= start_timestamp if start_timestamp else True,
        DeviceDataLog.timestamp <= end_timestamp if end_timestamp else True
    ).group_by(DeviceDataLog.position_quality).all()
    
    position_quality_dict = {item[0]: item[1] for item in position_quality_stats}
    
    return {
        "total_count": total_count,
        "fall_count": fall_count,
        "fall_rate": round(fall_count / total_count * 100, 2) if total_count > 0 else 0,
        "avg_battery_level": round(float(avg_battery), 2),
        "wifi_connected_count": wifi_connected_count,
        "wifi_connected_rate": round(wifi_connected_count / total_count * 100, 2) if total_count > 0 else 0,
        "server_connected_count": server_connected_count,
        "server_connected_rate": round(server_connected_count / total_count * 100, 2) if total_count > 0 else 0,
        "position_quality_distribution": position_quality_dict
    }


def get_device_data_by_time_range(
    db: Session,
    device_id: int,
    start_timestamp: int,
    end_timestamp: int,
    interval_minutes: int = 60
) -> List[Dict[str, Any]]:
    """按时间范围获取设备数据（用于图表展示）"""
    # 计算时间间隔（秒）
    interval_seconds = interval_minutes * 60
    
    # 查询数据
    logs = db.query(DeviceDataLog).filter(
        DeviceDataLog.device_id == device_id,
        DeviceDataLog.timestamp >= start_timestamp,
        DeviceDataLog.timestamp <= end_timestamp
    ).order_by(DeviceDataLog.timestamp.asc()).all()
    
    if not logs:
        return []
    
    # 按时间间隔分组
    result = []
    current_interval_start = start_timestamp
    current_group = []
    
    for log in logs:
        if log.timestamp >= current_interval_start + interval_seconds:
            # 计算当前组的平均值
            if current_group:
                result.append({
                    "timestamp": current_interval_start,
                    "count": len(current_group),
                    "avg_accel_x": sum(float(l.accel_x) for l in current_group) / len(current_group),
                    "avg_accel_y": sum(float(l.accel_y) for l in current_group) / len(current_group),
                    "avg_accel_z": sum(float(l.accel_z) for l in current_group) / len(current_group),
                    "avg_battery": sum(l.battery_level for l in current_group) / len(current_group),
                    "fall_count": sum(1 for l in current_group if l.is_fall_confirmed)
                })
            current_group = [log]
            current_interval_start += interval_seconds
        else:
            current_group.append(log)
    
    # 处理最后一组
    if current_group:
        result.append({
            "timestamp": current_interval_start,
            "count": len(current_group),
            "avg_accel_x": sum(float(l.accel_x) for l in current_group) / len(current_group),
            "avg_accel_y": sum(float(l.accel_y) for l in current_group) / len(current_group),
            "avg_accel_z": sum(float(l.accel_z) for l in current_group) / len(current_group),
            "avg_battery": sum(l.battery_level for l in current_group) / len(current_group),
            "fall_count": sum(1 for l in current_group if l.is_fall_confirmed)
        })
    
    return result


def get_fall_statistics_by_device(
    db: Session,
    start_timestamp: Optional[int] = None,
    end_timestamp: Optional[int] = None
) -> List[Dict[str, Any]]:
    """按设备统计跌倒数据"""
    query = db.query(
        DeviceDataLog.device_id,
        Device.device_type,
        Device.model_desc,
        func.count(DeviceDataLog.id).label('fall_count'),
        func.avg(DeviceDataLog.fall_confidence).label('avg_confidence'),
        func.max(DeviceDataLog.fall_time).label('latest_fall_time')
    ).join(
        Device, DeviceDataLog.device_id == Device.device_id
    ).filter(
        DeviceDataLog.is_fall_confirmed == True
    )
    
    if start_timestamp is not None:
        query = query.filter(DeviceDataLog.fall_time >= start_timestamp)
    if end_timestamp is not None:
        query = query.filter(DeviceDataLog.fall_time <= end_timestamp)
    
    results = query.group_by(
        DeviceDataLog.device_id,
        Device.device_type,
        Device.model_desc
    ).all()
    
    return [
        {
            "device_id": r.device_id,
            "device_type": r.device_type,
            "device_name": r.model_desc or r.device_type,
            "fall_count": r.fall_count,
            "avg_confidence": round(float(r.avg_confidence), 2),
            "latest_fall_time": r.latest_fall_time
        }
        for r in results
    ]


def search_elder_detail(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    device_id: Optional[int] = None,
    elderly_user_id: Optional[int] = None,
    elderly_name: Optional[str] = None,
    is_fall_confirmed: Optional[bool] = None,
    start_timestamp: Optional[int] = None,
    end_timestamp: Optional[int] = None
) -> List[DeviceDataLog]:
    """
    搜索老者详情
    联查 device_data_log、device 和 user 表，获取包含老者信息的数据日志
    
    Args:
        db: 数据库会话
        skip: 跳过记录数
        limit: 返回记录数
        device_id: 可选，筛选特定设备
        elderly_user_id: 可选，筛选特定老者用户ID
        elderly_name: 可选，筛选老者姓名（模糊匹配）
        is_fall_confirmed: 可选，筛选是否确认跌倒
        start_timestamp: 可选，起始时间戳
        end_timestamp: 可选，结束时间戳
    
    Returns:
        包含设备信息和老者信息的数据日志列表
    """
    # 构建查询，使用 joinedload 预加载关联数据
    query = db.query(DeviceDataLog)
    
    # 判断是否需要 join user 表（用于筛选条件）
    need_join_user = elderly_name is not None or elderly_user_id is not None
    
    if need_join_user:
        # 需要 join user 表时，先 join device，再 outerjoin user
        query = query.join(Device, DeviceDataLog.device_id == Device.device_id)
        query = query.outerjoin(User, Device.elderly_user_id == User.user_id)
    else:
        # 不需要 join user 表时，只使用 joinedload 预加载关联数据
        query = query.options(
            joinedload(DeviceDataLog.device).joinedload(Device.elderly_user)
        )
    
    # 应用筛选条件
    if device_id is not None:
        query = query.filter(DeviceDataLog.device_id == device_id)
    
    if elderly_user_id is not None:
        if not need_join_user:
            query = query.join(Device, DeviceDataLog.device_id == Device.device_id)
            query = query.outerjoin(User, Device.elderly_user_id == User.user_id)
            need_join_user = True
        query = query.filter(Device.elderly_user_id == elderly_user_id)
    
    if elderly_name is not None:
        if not need_join_user:
            query = query.join(Device, DeviceDataLog.device_id == Device.device_id)
            query = query.outerjoin(User, Device.elderly_user_id == User.user_id)
            need_join_user = True
        query = query.filter(User.name.like(f"%{elderly_name}%"))
    
    if is_fall_confirmed is not None:
        query = query.filter(DeviceDataLog.is_fall_confirmed == is_fall_confirmed)
    
    if start_timestamp is not None:
        query = query.filter(DeviceDataLog.timestamp >= start_timestamp)
    
    if end_timestamp is not None:
        query = query.filter(DeviceDataLog.timestamp <= end_timestamp)
    
    # 如果之前使用了 join，需要确保使用 joinedload 预加载关联数据
    if need_join_user:
        query = query.options(
            joinedload(DeviceDataLog.device).joinedload(Device.elderly_user)
        )
    
    # 按时间倒序排列
    query = query.order_by(DeviceDataLog.timestamp.desc())
    
    # 分页
    return query.offset(skip).limit(limit).all()

