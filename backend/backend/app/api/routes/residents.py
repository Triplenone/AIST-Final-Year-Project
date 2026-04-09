"""
住民API路由（聚合User/Event/Device数据）
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from typing import List, Optional, Tuple
from datetime import datetime
from app.database import get_db
from app.models.user import User
from app.models.event import Event
from app.models.location_zone import LocationZone
from app.models.user_status import UserStatus
from app.models.device import Device
from app.models.device_data_log import DeviceDataLog
from app.schemas.resident import ResidentResponse, ResidentVitals
from app.schemas.device_data_log import DeviceDataLogResponse

router = APIRouter()


def build_resident_avatar_url(user: User) -> str:
    """
    生成住民默认头像 URL（避免前端因缺失头像字段而额外兜底）。
    """
    seed = f"{user.user_id}-{user.name or 'resident'}"
    return f"https://api.dicebear.com/7.x/initials/svg?seed={seed}"


def calculate_resident_status(db: Session, user_id: int) -> str:
    """根据最新事件计算住民状态"""
    latest_event = db.query(Event).filter(
        Event.related_user_id == user_id
    ).order_by(Event.event_timestamp.desc()).first()
    
    if not latest_event:
        return 'stable'
    
    if latest_event.event_status == 'unhandled':
        if latest_event.event_type in ['fall', 'sos', 'vital_signs_abnormal']:
            return 'high'
        elif latest_event.event_type in ['bed_exit', 'bathroom_retention']:
            return 'followUp'
    
    return 'stable'


def get_resident_vitals(db: Session, user_id: int) -> Optional[ResidentVitals]:
    """从最新事件中提取生命体征"""
    latest_vital_event = db.query(Event).filter(
        Event.related_user_id == user_id,
        Event.event_type == 'vital_signs_abnormal'
    ).order_by(Event.event_timestamp.desc()).first()
    
    if latest_vital_event and latest_vital_event.event_params:
        params = latest_vital_event.event_params
        return ResidentVitals(
            hr=params.get('hr'),
            bp_systolic=params.get('bp_systolic'),
            bp_diastolic=params.get('bp_diastolic'),
            spo2=params.get('spo2'),
            temperature=params.get('temperature')
        )
    return None


def get_last_seen_info(db: Session, user_id: int) -> Tuple[Optional[str], Optional[str]]:
    """获取最后出现时间和位置"""
    latest_event = db.query(Event).filter(
        Event.related_user_id == user_id
    ).order_by(Event.event_timestamp.desc()).first()
    
    if not latest_event:
        return None, None
    
    location_name = None
    if latest_event.location_zone_id:
        location = db.query(LocationZone).filter(
            LocationZone.location_zone_id == latest_event.location_zone_id
        ).first()
        if location:
            location_name = location.name
    
    return (
        latest_event.event_timestamp.isoformat() if latest_event.event_timestamp else None,
        location_name
    )


def get_resident_room(db: Session, user_id: int) -> str:
    """获取住民房间（从最新位置或默认位置）"""
    latest_event = db.query(Event).filter(
        Event.related_user_id == user_id
    ).order_by(Event.event_timestamp.desc()).first()
    
    if latest_event and latest_event.location_zone_id:
        location = db.query(LocationZone).filter(
            LocationZone.location_zone_id == latest_event.location_zone_id
        ).first()
        if location:
            return location.name
    
    return "Unknown"


@router.get("/", response_model=List[ResidentResponse])
def get_residents(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """获取住民列表（聚合User/Event/Device数据）"""
    try:
        # 只获取elderly角色的用户
        users = db.query(User).filter(
            User.role_type == 'elderly'
        ).offset(skip).limit(limit).all()
        
        if not users:
            return []
        
        # 批量获取所有用户ID
        user_ids = [user.user_id for user in users]
        
        if not user_ids:
            return []
        
        # 优化：批量查询所有用户的最新事件（减少N+1查询问题）
        from sqlalchemy import func
        
        # 子查询：获取每个用户的最新事件ID
        latest_events = []
        try:
            subquery = db.query(
                Event.related_user_id,
                func.max(Event.event_timestamp).label('max_timestamp')
            ).filter(
                Event.related_user_id.in_(user_ids)
            ).group_by(Event.related_user_id).subquery()
            
            # 获取每个用户的最新事件
            latest_events = db.query(Event).join(
                subquery,
                (Event.related_user_id == subquery.c.related_user_id) &
                (Event.event_timestamp == subquery.c.max_timestamp)
            ).all()
        except Exception as e:
            print(f"Warning: Error querying events: {e}")
            latest_events = []
        
        # 创建事件字典，按user_id索引
        events_by_user = {}
        for event in latest_events:
            if event.related_user_id not in events_by_user:
                events_by_user[event.related_user_id] = event
        
        # 批量获取所有需要的位置信息
        location_ids = [e.location_zone_id for e in latest_events if e.location_zone_id]
        locations = {}
        if location_ids:
            location_list = db.query(LocationZone).filter(
                LocationZone.location_zone_id.in_(location_ids)
            ).all()
            locations = {loc.location_zone_id: loc for loc in location_list}
        
        # 批量获取生命体征事件
        vital_events = []
        try:
            vital_events = db.query(Event).filter(
                Event.related_user_id.in_(user_ids),
                Event.event_type == 'vital_signs_abnormal'
            ).order_by(Event.event_timestamp.desc()).all()
        except Exception as e:
            print(f"Warning: Error querying vital events: {e}")
            vital_events = []
        
        # 创建生命体征字典（每个用户只保留最新的）
        vitals_by_user = {}
        for event in vital_events:
            if event.related_user_id not in vitals_by_user:
                vitals_by_user[event.related_user_id] = event
        
        # 批量获取用户状态（每个用户最新的状态）
        user_statuses = []
        try:
            user_statuses = db.query(UserStatus).options(
                joinedload(UserStatus.device)
            ).filter(
                UserStatus.user_id.in_(user_ids)
            ).order_by(UserStatus.status_timestamp.desc()).all()
        except Exception as e:
            print(f"Warning: Error querying user statuses: {e}")
            user_statuses = []
        
        # 创建用户状态字典（每个用户只保留最新的）
        statuses_by_user = {}
        devices_by_user = {}
        for status in user_statuses:
            if status.user_id not in statuses_by_user:
                statuses_by_user[status.user_id] = status
                # 获取关联的设备信息
                if status.device:
                    devices_by_user[status.user_id] = status.device
        
        # 构建响应
        residents = []
        for user in users:
            user_id = user.user_id
            latest_event = events_by_user.get(user_id)
            
            # 获取用户状态和设备信息
            user_status = statuses_by_user.get(user_id)
            device = devices_by_user.get(user_id)
            
            # 提取用户状态数据
            user_status_id = None
            heart_rate = None
            blood_oxygen = None
            body_temperature = None
            is_normal = None
            status_timestamp = None
            
            if user_status:
                user_status_id = user_status.user_status_id
                heart_rate = user_status.heart_rate
                blood_oxygen = float(user_status.blood_oxygen) if user_status.blood_oxygen is not None else None
                body_temperature = float(user_status.body_temperature) if user_status.body_temperature is not None else None
                is_normal = user_status.is_normal
                status_timestamp = user_status.status_timestamp.isoformat() if user_status.status_timestamp else None
            
            # 提取设备信息
            device_id = None
            device_current_status = None
            device_battery_level = None
            device_deploy_location = None
            
            if device:
                device_id = device.device_id
                # 安全处理设备状态枚举
                try:
                    if isinstance(device.current_status, str):
                        device_current_status = device.current_status
                    elif hasattr(device.current_status, 'value'):
                        device_current_status = device.current_status.value
                    else:
                        device_current_status = str(device.current_status) if device.current_status else None
                except (AttributeError, ValueError):
                    device_current_status = str(device.current_status) if device.current_status else None
                device_battery_level = device.battery_level
                device_deploy_location = device.deploy_location
            
            # 计算状态
            if not latest_event:
                status = 'stable'
            elif latest_event.event_status == 'unhandled':
                if latest_event.event_type in ['fall', 'sos', 'vital_signs_abnormal']:
                    status = 'high'
                elif latest_event.event_type in ['bed_exit', 'bathroom_retention']:
                    status = 'followUp'
                else:
                    status = 'stable'
            else:
                status = 'stable'
            
            # 获取生命体征
            vitals = None
            vital_event = vitals_by_user.get(user_id)
            if vital_event and vital_event.event_params:
                params = vital_event.event_params
                vitals = ResidentVitals(
                    hr=params.get('hr'),
                    bp_systolic=params.get('bp_systolic'),
                    bp_diastolic=params.get('bp_diastolic'),
                    spo2=params.get('spo2'),
                    temperature=params.get('temperature')
                )
            
            # 获取最后出现信息
            last_seen_at = None
            last_seen_location = None
            if latest_event:
                last_seen_at = latest_event.event_timestamp.isoformat() if latest_event.event_timestamp else None
                if latest_event.location_zone_id and latest_event.location_zone_id in locations:
                    last_seen_location = locations[latest_event.location_zone_id].name
            
            # 获取房间
            room = "Unknown"
            if latest_event and latest_event.location_zone_id and latest_event.location_zone_id in locations:
                room = locations[latest_event.location_zone_id].name
            
            residents.append(ResidentResponse(
                id=str(user.user_id),
                name=user.name,
                avatar_url=build_resident_avatar_url(user),
                room=room,
                status=status,
                last_seen_at=last_seen_at,
                last_seen_location=last_seen_location or "",
                vitals=vitals,
                checked_out=False,
                created_at=user.created_at.isoformat() if user.created_at else datetime.now().isoformat(),
                updated_at=user.updated_at.isoformat() if user.updated_at else datetime.now().isoformat(),
                # 用户状态字段
                user_status_id=user_status_id,
                heart_rate=heart_rate,
                blood_oxygen=blood_oxygen,
                body_temperature=body_temperature,
                is_normal=is_normal,
                status_timestamp=status_timestamp,
                # 设备字段
                device_id=device_id,
                device_current_status=device_current_status,
                device_battery_level=device_battery_level,
                device_deploy_location=device_deploy_location
            ))
        
        return residents
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in get_residents: {error_detail}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


@router.get("/{resident_id}", response_model=ResidentResponse)
def get_resident(resident_id: str, db: Session = Depends(get_db)):
    """根据ID获取住民详情"""
    try:
        user_id = int(resident_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的住民ID")
    
    user = db.query(User).filter(
        User.user_id == user_id,
        User.role_type == 'elderly'
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="住民不存在")
    
    status = calculate_resident_status(db, user.user_id)
    vitals = get_resident_vitals(db, user.user_id)
    last_seen_at, last_seen_location = get_last_seen_info(db, user.user_id)
    room = get_resident_room(db, user.user_id)
    
    # 获取用户状态和设备信息
    user_status = db.query(UserStatus).options(
        joinedload(UserStatus.device)
    ).filter(
        UserStatus.user_id == user.user_id
    ).order_by(UserStatus.status_timestamp.desc()).first()
    
    # 提取用户状态数据
    user_status_id = None
    heart_rate = None
    blood_oxygen = None
    body_temperature = None
    is_normal = None
    status_timestamp = None
    
    if user_status:
        user_status_id = user_status.user_status_id
        heart_rate = user_status.heart_rate
        blood_oxygen = float(user_status.blood_oxygen) if user_status.blood_oxygen is not None else None
        body_temperature = float(user_status.body_temperature) if user_status.body_temperature is not None else None
        is_normal = user_status.is_normal
        status_timestamp = user_status.status_timestamp.isoformat() if user_status.status_timestamp else None
    
    # 提取设备信息
    device_id = None
    device_current_status = None
    device_battery_level = None
    device_deploy_location = None
    
    if user_status and user_status.device:
        device = user_status.device
        device_id = device.device_id
        # 安全处理设备状态枚举
        try:
            if isinstance(device.current_status, str):
                device_current_status = device.current_status
            elif hasattr(device.current_status, 'value'):
                device_current_status = device.current_status.value
            else:
                device_current_status = str(device.current_status) if device.current_status else None
        except (AttributeError, ValueError):
            device_current_status = str(device.current_status) if device.current_status else None
        device_battery_level = device.battery_level
        device_deploy_location = device.deploy_location
    
    return ResidentResponse(
        id=str(user.user_id),
        name=user.name,
        avatar_url=build_resident_avatar_url(user),
        room=room,
        status=status,
        last_seen_at=last_seen_at,
        last_seen_location=last_seen_location or "",
        vitals=vitals,
        checked_out=False,
        created_at=user.created_at.isoformat() if user.created_at else datetime.now().isoformat(),
        updated_at=user.updated_at.isoformat() if user.updated_at else datetime.now().isoformat(),
        # 用户状态字段
        user_status_id=user_status_id,
        heart_rate=heart_rate,
        blood_oxygen=blood_oxygen,
        body_temperature=body_temperature,
        is_normal=is_normal,
        status_timestamp=status_timestamp,
        # 设备字段
        device_id=device_id,
        device_current_status=device_current_status,
        device_battery_level=device_battery_level,
        device_deploy_location=device_deploy_location
    )


@router.get("/{resident_id}/device-data-logs", response_model=List[DeviceDataLogResponse])
def get_resident_device_data_logs(
    resident_id: str,
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回记录数"),
    db: Session = Depends(get_db)
):
    """
    获取住民关联设备的数据日志
    
    - **resident_id**: 住民ID
    - **skip**: 跳过记录数（分页）
    - **limit**: 返回记录数（分页）
    """
    try:
        user_id = int(resident_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的住民ID")
    
    # 验证住民是否存在
    user = db.query(User).filter(
        User.user_id == user_id,
        User.role_type == 'elderly'
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="住民不存在")
    
    # 获取住民关联的设备ID
    devices = db.query(Device).filter(
        Device.elderly_user_id == user_id
    ).all()
    
    if not devices:
        return []
    
    device_ids = [device.device_id for device in devices]
    
    # 获取设备数据日志（查询所有相关设备的数据）
    logs = db.query(DeviceDataLog).options(
        joinedload(DeviceDataLog.device)
    ).filter(
        DeviceDataLog.device_id.in_(device_ids)
    ).order_by(DeviceDataLog.timestamp.desc()).offset(skip).limit(limit).all()
    
    # 转换为响应格式
    from app.api.routes.device_data_log import log_to_response
    return [log_to_response(log) for log in logs]

