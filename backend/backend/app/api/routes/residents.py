"""
住民API路由（聚合User/Event/Device数据）
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from typing import Any, Dict, List, Optional, Set, Tuple
from datetime import datetime
import math
import re
from app.database import get_db
from app.config import settings
from app.db.mongo import COLLECTION_RAW_UPSTREAM
from app.models.user import User
from app.models.event import Event
from app.models.location_zone import LocationZone
from app.models.user_status import UserStatus
from app.models.device import Device
from app.models.device_data_log import DeviceDataLog
from app.schemas.resident import ResidentResponse, ResidentVitals
from app.schemas.device_data_log import DeviceDataLogResponse
from app.services.mongo_resident_sensor_vitals import load_mongo_sensor_vitals_for_users
from app.services.mongo_raw_upstream import get_sync_mongo_db
from app.services.elderly_device_queries import devices_by_elderly_user_ids

router = APIRouter()


def _reverse_device_map() -> Dict[int, str]:
    return {value: key for key, value in settings.device_id_map.items()}


def _candidate_ids_for_device(dev: Device, reverse_map: Dict[int, str]) -> List[str]:
    out: List[str] = [str(dev.device_id)]
    if dev.mac_address:
        out.append(str(dev.mac_address).strip())
    ext = reverse_map.get(dev.device_id)
    if ext:
        out.append(str(ext))
    return list(dict.fromkeys([item for item in out if item]))


def _to_finite_float(value: Any) -> Optional[float]:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(parsed):
        return None
    return parsed


def _extract_mongo_location(doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    payload = doc.get("payload") if isinstance(doc.get("payload"), dict) else {}
    location = payload.get("location") if isinstance(payload.get("location"), dict) else {}
    if not location and isinstance(doc.get("location"), dict):
        location = doc.get("location")
    if not isinstance(location, dict):
        return None

    current = location.get("current") if isinstance(location.get("current"), dict) else {}
    if not current:
        return None

    x = _to_finite_float(current.get("x"))
    y = _to_finite_float(current.get("y"))
    if x is None or y is None:
        return None

    location_name = current.get("name")
    location_name = location_name.strip() if isinstance(location_name, str) else None
    if location_name == "":
        location_name = None

    zone_id = current.get("location_zone_id")
    if zone_id is None:
        zone_id = current.get("zone_id")
    if zone_id is None:
        zone_id = current.get("locationZoneId")

    return {
        "location_name": location_name,
        "location_zone_id": zone_id,
        "server_received_at": doc.get("server_received_at"),
    }


def _normalize_room_label(raw_room: str, user_id: int) -> str:
    """
    Normalize placeholder test-room labels for UI display.
    Rule: test-roomXX / test_roomXX -> room{user_id}
    """
    room = (raw_room or "").strip()
    if not room:
        return room
    if re.fullmatch(r"test[-_]room\d+", room, flags=re.IGNORECASE):
        return f"room{user_id}"
    return room


def load_mongo_latest_locations_for_users(db: Session, user_ids: List[int]) -> Dict[int, Dict[str, Any]]:
    """
    Return latest valid Mongo location per user, keyed by user_id.
    Falls back through all mapped device-id candidates so it still works when
    upstream writes either external ESP32 IDs or MySQL numeric IDs.
    """
    if not user_ids:
        return {}

    devices_per_user = devices_by_elderly_user_ids(db, user_ids)
    if not any(devices_per_user.values()):
        return {}

    reverse_map = _reverse_device_map()
    candidate_ids_by_user: Dict[int, Set[str]] = {}
    candidate_to_users: Dict[str, Set[int]] = {}
    mysql_ids: Set[int] = set()

    for uid in user_ids:
        for dev in devices_per_user.get(uid) or []:
            mysql_ids.add(int(dev.device_id))
            for candidate in _candidate_ids_for_device(dev, reverse_map):
                candidate_ids_by_user.setdefault(uid, set()).add(candidate)
                candidate_to_users.setdefault(candidate, set()).add(uid)

    if not candidate_to_users and not mysql_ids:
        return {}

    query_parts: List[Dict[str, Any]] = []
    if candidate_to_users:
        cands = sorted(candidate_to_users.keys())
        query_parts.append({"device_id": {"$in": cands} if len(cands) > 1 else cands[0]})
    if mysql_ids:
        mids = sorted(mysql_ids)
        query_parts.append({"mysql_device_id": {"$in": mids} if len(mids) > 1 else mids[0]})

    query: Dict[str, Any]
    if len(query_parts) == 1:
        query = query_parts[0]
    else:
        query = {"$or": query_parts}

    try:
        coll = get_sync_mongo_db()[COLLECTION_RAW_UPSTREAM]
        cursor = coll.find(query).sort("server_received_at", -1).limit(2000)
    except Exception as exc:
        print(f"Warning: Mongo location fallback skipped: {exc}")
        return {}

    unresolved: Set[int] = set(candidate_ids_by_user.keys())
    out: Dict[int, Dict[str, Any]] = {}

    for doc in cursor:
        if not unresolved:
            break

        location = _extract_mongo_location(doc)
        if not location:
            continue

        matched_users: Set[int] = set()
        did = doc.get("device_id")
        if did is not None:
            did_str = str(did).strip()
            if did_str:
                matched_users.update(candidate_to_users.get(did_str, set()))

        mysql_device_id = doc.get("mysql_device_id")
        if mysql_device_id is not None:
            try:
                mysql_device_id_int = int(mysql_device_id)
            except (TypeError, ValueError):
                mysql_device_id_int = None
            if mysql_device_id_int is not None:
                matched_users.update(candidate_to_users.get(str(mysql_device_id_int), set()))

        for uid in list(matched_users):
            if uid not in unresolved:
                continue
            out[uid] = location
            unresolved.discard(uid)

    return out


def _apply_mongo_sensor_vitals(
    user_id: int,
    mongo_map: Dict[int, Tuple[Optional[int], Optional[float]]],
    vitals: Optional[ResidentVitals],
    heart_rate: Optional[int],
    blood_oxygen: Optional[float],
) -> Tuple[Optional[ResidentVitals], Optional[int], Optional[float]]:
    """Overlay latest MongoDB sensors.* readings onto SQL-derived vitals / user_status."""
    pair = mongo_map.get(user_id)
    if not pair:
        return vitals, heart_rate, blood_oxygen
    mh, ms = pair

    new_hr = mh if mh is not None else heart_rate
    new_bo = float(ms) if ms is not None else blood_oxygen

    if vitals is None:
        if mh is None and ms is None:
            return vitals, new_hr, new_bo
        new_vitals = ResidentVitals(
            hr=mh,
            bp_systolic=None,
            bp_diastolic=None,
            spo2=int(round(ms)) if ms is not None else None,
            temperature=None,
        )
        return new_vitals, new_hr, new_bo

    new_vitals = ResidentVitals(
        hr=mh if mh is not None else vitals.hr,
        bp_systolic=vitals.bp_systolic,
        bp_diastolic=vitals.bp_diastolic,
        spo2=int(round(ms)) if ms is not None else vitals.spo2,
        temperature=vitals.temperature,
    )
    return new_vitals, new_hr, new_bo


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

    # 回退链：最新事件位置 -> 最近一次有位置事件 -> 最新 user_status 位置
    location_name = None
    location_zone_id = latest_event.location_zone_id

    if not location_zone_id:
        latest_location_event = db.query(Event).filter(
            Event.related_user_id == user_id,
            Event.location_zone_id.isnot(None)
        ).order_by(Event.event_timestamp.desc()).first()
        if latest_location_event:
            location_zone_id = latest_location_event.location_zone_id

    if not location_zone_id:
        try:
            latest_status = db.query(UserStatus).filter(
                UserStatus.user_id == user_id
            ).order_by(UserStatus.status_timestamp.desc()).first()
            if latest_status and latest_status.location_zone_id:
                location_zone_id = latest_status.location_zone_id
        except Exception as e:
            print(f"Warning: user_status fallback skipped in get_last_seen_info: {e}")

    if location_zone_id:
        location = db.query(LocationZone).filter(
            LocationZone.location_zone_id == location_zone_id
        ).first()
        if location:
            location_name = location.name
    
    return (
        latest_event.event_timestamp.isoformat() if latest_event.event_timestamp else None,
        location_name
    )


def get_resident_room(db: Session, user_id: int) -> str:
    """获取住民房间（从最新位置或默认位置）"""
    _, last_seen_location = get_last_seen_info(db, user_id)
    if last_seen_location:
        return last_seen_location
    try:
        latest_status = db.query(UserStatus).options(
            joinedload(UserStatus.device)
        ).filter(
            UserStatus.user_id == user_id
        ).order_by(UserStatus.status_timestamp.desc()).first()
        if latest_status and latest_status.device and latest_status.device.deploy_location:
            return latest_status.device.deploy_location
    except Exception as e:
        print(f"Warning: user_status room fallback skipped: {e}")
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
        
        # 批量获取每个用户最近一次“有位置”的事件（不被无位置事件覆盖）
        latest_loc_events = []
        try:
            subquery_loc = db.query(
                Event.related_user_id,
                func.max(Event.event_timestamp).label('max_timestamp')
            ).filter(
                Event.related_user_id.in_(user_ids),
                Event.location_zone_id.isnot(None)
            ).group_by(Event.related_user_id).subquery()
            latest_loc_events = db.query(Event).join(
                subquery_loc,
                (Event.related_user_id == subquery_loc.c.related_user_id) &
                (Event.event_timestamp == subquery_loc.c.max_timestamp)
            ).all()
        except Exception as e:
            print(f"Warning: Error querying latest location events: {e}")
            latest_loc_events = []
        location_event_by_user = {event.related_user_id: event for event in latest_loc_events}

        # 批量获取所有需要的位置信息（先含 latest event + latest location event）
        location_ids = [e.location_zone_id for e in latest_events if e.location_zone_id]
        location_ids.extend([e.location_zone_id for e in latest_loc_events if e.location_zone_id])
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
        devices_by_user_status = {}
        for status in user_statuses:
            if status.user_id not in statuses_by_user:
                statuses_by_user[status.user_id] = status
                # 获取关联的设备信息
                if status.device:
                    devices_by_user_status[status.user_id] = status.device

        # 绑定链（主来源）：device.elderly_user_id，必须与 Device 管理页绑定一致
        bound_devices = []
        try:
            bound_devices = db.query(Device).filter(
                Device.elderly_user_id.in_(user_ids)
            ).order_by(Device.updated_at.desc(), Device.device_id.desc()).all()
        except Exception as e:
            print(f"Warning: Error querying bound devices by elderly_user_id: {e}")
            bound_devices = []
        devices_by_binding = {}
        for device in bound_devices:
            uid = device.elderly_user_id
            if not uid:
                continue
            if uid not in devices_by_binding:
                devices_by_binding[uid] = device

        # 补充 user_status 中的位置区，完善 last_seen_location 回退链
        status_location_ids = [s.location_zone_id for s in user_statuses if s.location_zone_id]
        missing_status_location_ids = [loc_id for loc_id in status_location_ids if loc_id not in locations]
        if missing_status_location_ids:
            status_locations = db.query(LocationZone).filter(
                LocationZone.location_zone_id.in_(missing_status_location_ids)
            ).all()
            for loc in status_locations:
                locations[loc.location_zone_id] = loc

        mongo_vitals_map: Dict[int, Tuple[Optional[int], Optional[float]]] = {}
        try:
            mongo_vitals_map = load_mongo_sensor_vitals_for_users(db, user_ids)
        except Exception as e:
            print(f"Warning: Mongo vitals merge skipped: {e}")

        mongo_locations_by_user: Dict[int, Dict[str, Any]] = {}
        try:
            mongo_locations_by_user = load_mongo_latest_locations_for_users(db, user_ids)
        except Exception as e:
            print(f"Warning: Mongo location fallback skipped: {e}")
        
        # 构建响应
        residents = []
        for user in users:
            user_id = user.user_id
            latest_event = events_by_user.get(user_id)
            
            # 获取用户状态和设备信息
            user_status = statuses_by_user.get(user_id)
            # 按需求：优先使用 Device 管理页绑定（device.elderly_user_id）
            # 若未绑定，再回退到 user_status.device（兼容历史链路）
            device = devices_by_binding.get(user_id) or devices_by_user_status.get(user_id)
            
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

            vitals, heart_rate, blood_oxygen = _apply_mongo_sensor_vitals(
                user_id, mongo_vitals_map, vitals, heart_rate, blood_oxygen
            )
            
            # 获取最后出现信息（回退链：最新事件位置 -> 最近有位置事件 -> user_status 位置 -> device 部署位置）
            last_seen_at = None
            last_seen_location = None
            if latest_event:
                last_seen_at = latest_event.event_timestamp.isoformat() if latest_event.event_timestamp else None
            loc_zone_id = latest_event.location_zone_id if latest_event else None
            if not loc_zone_id:
                loc_event = location_event_by_user.get(user_id)
                loc_zone_id = loc_event.location_zone_id if loc_event else None
            if not loc_zone_id and user_status and user_status.location_zone_id:
                loc_zone_id = user_status.location_zone_id
            if loc_zone_id and loc_zone_id in locations:
                last_seen_location = locations[loc_zone_id].name
            if not last_seen_location:
                mongo_location = mongo_locations_by_user.get(user_id)
                if mongo_location:
                    mongo_zone_id = mongo_location.get("location_zone_id")
                    if mongo_zone_id is not None:
                        try:
                            mongo_zone_id = int(mongo_zone_id)
                        except (TypeError, ValueError):
                            mongo_zone_id = None
                    if mongo_zone_id and mongo_zone_id in locations:
                        last_seen_location = locations[mongo_zone_id].name
                    elif mongo_location.get("location_name"):
                        last_seen_location = str(mongo_location.get("location_name"))
                    if not last_seen_at and mongo_location.get("server_received_at"):
                        server_received_at = mongo_location.get("server_received_at")
                        if isinstance(server_received_at, datetime):
                            last_seen_at = server_received_at.isoformat()
            
            # 获取房间：优先位置名，再回退 device.deploy_location
            room = _normalize_room_label(
                last_seen_location or (device_deploy_location or "Unknown"),
                user_id,
            )
            
            residents.append(ResidentResponse(
                id=str(user.user_id),
                name=user.name,
                avatar_url=None,
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
    try:
        user_status = db.query(UserStatus).options(
            joinedload(UserStatus.device)
        ).filter(
            UserStatus.user_id == user.user_id
        ).order_by(UserStatus.status_timestamp.desc()).first()
    except Exception as e:
        print(f"Warning: user_status detail lookup skipped: {e}")
        user_status = None

    fallback_device = db.query(Device).filter(
        Device.elderly_user_id == user.user_id
    ).order_by(Device.updated_at.desc(), Device.device_id.desc()).first()
    
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
    
    # 按需求：详情接口也以 Device 管理绑定为准
    selected_device = fallback_device if fallback_device else (user_status.device if (user_status and user_status.device) else None)
    if selected_device:
        device = selected_device
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

    mongo_vitals_map: Dict[int, Tuple[Optional[int], Optional[float]]] = {}
    try:
        mongo_vitals_map = load_mongo_sensor_vitals_for_users(db, [user.user_id])
    except Exception as e:
        print(f"Warning: Mongo vitals merge skipped: {e}")
    vitals, heart_rate, blood_oxygen = _apply_mongo_sensor_vitals(
        user.user_id, mongo_vitals_map, vitals, heart_rate, blood_oxygen
    )

    if not last_seen_location:
        try:
            mongo_locations = load_mongo_latest_locations_for_users(db, [user.user_id])
        except Exception as e:
            print(f"Warning: Mongo location fallback skipped: {e}")
            mongo_locations = {}
        mongo_location = mongo_locations.get(user.user_id)
        if mongo_location:
            mongo_zone_id = mongo_location.get("location_zone_id")
            zone_name = None
            if mongo_zone_id is not None:
                try:
                    mongo_zone_id = int(mongo_zone_id)
                except (TypeError, ValueError):
                    mongo_zone_id = None
            if mongo_zone_id is not None:
                zone = db.query(LocationZone).filter(
                    LocationZone.location_zone_id == mongo_zone_id
                ).first()
                if zone:
                    zone_name = zone.name
            last_seen_location = zone_name or mongo_location.get("location_name") or last_seen_location
            if not last_seen_at and mongo_location.get("server_received_at"):
                server_received_at = mongo_location.get("server_received_at")
                if isinstance(server_received_at, datetime):
                    last_seen_at = server_received_at.isoformat()

    if (not room or room == "Unknown") and last_seen_location:
        room = last_seen_location
    
    return ResidentResponse(
        id=str(user.user_id),
        name=user.name,
        avatar_url=None,
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

