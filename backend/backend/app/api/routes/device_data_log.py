"""
设备数据日志API路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.database import get_db
from app.models.device_data_log import DeviceDataLog
from app.schemas.device_data_log import (
    DeviceDataLogResponse, 
    DeviceDataLogCreate, 
    DeviceDataLogUpdate,
    ElderDetailResponse
)
from app import crud

router = APIRouter()


def convert_decimal_to_float(value):
    """安全转换Decimal到float"""
    if value is None:
        return 0.0
    return float(value)


def log_to_response(log: DeviceDataLog) -> DeviceDataLogResponse:
    """将数据库模型转换为响应模型"""
    try:
        # 安全获取设备信息
        device_name = None
        device_type = None
        if log.device:
            try:
                device_name = log.device.model_desc or log.device.device_type
                device_type = log.device.device_type
            except (AttributeError, TypeError):
                device_name = None
                device_type = None
        
        return DeviceDataLogResponse(
            id=log.id,
            device_id=log.device_id,
            device_name=device_name,
            device_type=device_type,
            timestamp=log.timestamp,
            relative_time=log.relative_time,
            accel_x=convert_decimal_to_float(log.accel_x),
            accel_y=convert_decimal_to_float(log.accel_y),
            accel_z=convert_decimal_to_float(log.accel_z),
            gyro_x=convert_decimal_to_float(log.gyro_x),
            gyro_y=convert_decimal_to_float(log.gyro_y),
            gyro_z=convert_decimal_to_float(log.gyro_z),
            loc_x=convert_decimal_to_float(log.loc_x),
            loc_y=convert_decimal_to_float(log.loc_y),
            loc_z=convert_decimal_to_float(log.loc_z),
            loc_accuracy=convert_decimal_to_float(log.loc_accuracy),
            position_quality=log.position_quality,
            fall_state=log.fall_state,
            fall_state_description=log.fall_state_description,
            fall_confidence=convert_decimal_to_float(log.fall_confidence),
            is_fall_confirmed=bool(log.is_fall_confirmed) if log.is_fall_confirmed is not None else False,
            impact_force=convert_decimal_to_float(log.impact_force),
            fall_direction=log.fall_direction,
            fall_time=log.fall_time,
            wifi_connected=bool(log.wifi_connected) if log.wifi_connected is not None else False,
            server_connected=bool(log.server_connected) if log.server_connected is not None else False,
            battery_level=int(log.battery_level) if log.battery_level is not None else 0,
            server_receive_time=log.server_receive_time,
            created_at=log.created_at
        )
    except Exception as e:
        import traceback
        print(f"Error in log_to_response for log {log.id if hasattr(log, 'id') else 'unknown'}: {e}")
        traceback.print_exc()
        raise


def log_to_elder_detail_response(log: DeviceDataLog) -> ElderDetailResponse:
    """将数据库模型转换为包含老者信息的响应模型"""
    device = log.device
    elderly_user = device.elderly_user if device else None
    
    # 安全处理设备状态枚举
    device_status = None
    if device and device.current_status:
        try:
            # 尝试获取枚举值
            if isinstance(device.current_status, str):
                device_status = device.current_status
            elif hasattr(device.current_status, 'value'):
                device_status = device.current_status.value
            else:
                device_status = str(device.current_status)
        except (AttributeError, ValueError, TypeError):
            # 如果无法获取枚举值，尝试直接使用字符串
            device_status = str(device.current_status) if device.current_status else None
    
    return ElderDetailResponse(
        # 数据日志基本信息
        id=log.id,
        device_id=log.device_id,
        timestamp=log.timestamp,
        relative_time=log.relative_time,
        
        # 设备信息
        device_name=device.model_desc or device.device_type if device else None,
        device_type=device.device_type if device else None,
        device_status=device_status,
        mac_address=device.mac_address if device else None,
        deploy_location=device.deploy_location if device else None,
        
        # 老者信息
        elderly_user_id=elderly_user.user_id if elderly_user else None,
        elderly_name=elderly_user.name if elderly_user else None,
        elderly_age=elderly_user.age if elderly_user else None,
        elderly_gender=elderly_user.gender.value if elderly_user and elderly_user.gender else None,
        
        # 加速度计数据
        accel_x=convert_decimal_to_float(log.accel_x),
        accel_y=convert_decimal_to_float(log.accel_y),
        accel_z=convert_decimal_to_float(log.accel_z),
        
        # 陀螺仪数据
        gyro_x=convert_decimal_to_float(log.gyro_x),
        gyro_y=convert_decimal_to_float(log.gyro_y),
        gyro_z=convert_decimal_to_float(log.gyro_z),
        
        # 位置数据
        loc_x=convert_decimal_to_float(log.loc_x),
        loc_y=convert_decimal_to_float(log.loc_y),
        loc_z=convert_decimal_to_float(log.loc_z),
        loc_accuracy=convert_decimal_to_float(log.loc_accuracy),
        position_quality=log.position_quality,
        
        # 跌倒检测数据
        fall_state=log.fall_state,
        fall_state_description=log.fall_state_description,
        fall_confidence=convert_decimal_to_float(log.fall_confidence),
        is_fall_confirmed=log.is_fall_confirmed,
        impact_force=convert_decimal_to_float(log.impact_force),
        fall_direction=log.fall_direction,
        fall_time=log.fall_time,
        
        # 连接状态
        wifi_connected=log.wifi_connected,
        server_connected=log.server_connected,
        battery_level=log.battery_level,
        
        # 时间戳
        server_receive_time=log.server_receive_time,
        created_at=log.created_at
    )


@router.get("/", response_model=List[DeviceDataLogResponse])
def get_device_data_logs(
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回记录数"),
    device_id: Optional[int] = Query(None, description="筛选设备ID"),
    is_fall_confirmed: Optional[bool] = Query(None, description="筛选是否确认跌倒"),
    position_quality: Optional[str] = Query(None, description="筛选位置质量（high/medium/low）"),
    start_timestamp: Optional[int] = Query(None, description="起始时间戳"),
    end_timestamp: Optional[int] = Query(None, description="结束时间戳"),
    db: Session = Depends(get_db)
):
    """
    获取设备数据日志列表（包含设备信息）
    
    - **skip**: 跳过记录数（分页）
    - **limit**: 返回记录数（分页）
    - **device_id**: 可选，筛选特定设备
    - **is_fall_confirmed**: 可选，筛选是否确认跌倒
    - **position_quality**: 可选，筛选位置质量
    - **start_timestamp**: 可选，起始时间戳
    - **end_timestamp**: 可选，结束时间戳
    """
    try:
        logs = crud.device_data_log.get_device_data_logs(
            db=db,
            skip=skip,
            limit=limit,
            device_id=device_id,
            is_fall_confirmed=is_fall_confirmed,
            position_quality=position_quality,
            start_timestamp=start_timestamp,
            end_timestamp=end_timestamp
        )
        print(f"Debug: Found {len(logs)} device data logs")
        result = []
        for log in logs:
            try:
                response = log_to_response(log)
                result.append(response)
            except Exception as e:
                print(f"Warning: Error converting log {log.id}: {e}")
                import traceback
                traceback.print_exc()
                continue
        print(f"Debug: Returning {len(result)} logs")
        return result
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in get_device_data_logs: {error_detail}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


@router.get("/{log_id}", response_model=DeviceDataLogResponse)
def get_device_data_log(log_id: int, db: Session = Depends(get_db)):
    """
    根据ID获取设备数据日志详情
    """
    try:
        log = crud.device_data_log.get_device_data_log(db, log_id)
        if not log:
            raise HTTPException(status_code=404, detail="设备数据日志不存在")
        return log_to_response(log)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in get_device_data_log: {error_detail}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


@router.get("/device/{device_id}/latest", response_model=DeviceDataLogResponse)
def get_latest_device_data_log(device_id: int, db: Session = Depends(get_db)):
    """
    获取指定设备的最新数据日志
    """
    try:
        log = crud.device_data_log.get_latest_device_data_log(db, device_id)
        if not log:
            raise HTTPException(status_code=404, detail="该设备暂无数据日志")
        return log_to_response(log)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in get_latest_device_data_log: {error_detail}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


@router.get("/device/{device_id}/falls", response_model=List[DeviceDataLogResponse])
def get_device_falls(
    device_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    获取指定设备的跌倒记录（仅返回确认跌倒的记录）
    """
    try:
        logs = crud.device_data_log.get_device_falls(db, device_id, skip, limit)
        return [log_to_response(log) for log in logs]
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in get_device_falls: {error_detail}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


@router.post("/", response_model=DeviceDataLogResponse)
def create_device_data_log(log_data: DeviceDataLogCreate, db: Session = Depends(get_db)):
    """
    创建新的设备数据日志记录
    """
    try:
        new_log, _ = crud.device_data_log.create_device_data_log(db, log_data)
        return log_to_response(new_log)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in create_device_data_log: {error_detail}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


@router.put("/{log_id}", response_model=DeviceDataLogResponse)
def update_device_data_log(
    log_id: int,
    log_data: DeviceDataLogUpdate,
    db: Session = Depends(get_db)
):
    """
    更新设备数据日志记录
    """
    try:
        log = crud.device_data_log.update_device_data_log(db, log_id, log_data)
        if not log:
            raise HTTPException(status_code=404, detail="设备数据日志不存在")
        return log_to_response(log)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in update_device_data_log: {error_detail}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


@router.delete("/{log_id}")
def delete_device_data_log(log_id: int, db: Session = Depends(get_db)):
    """
    删除设备数据日志记录
    """
    try:
        success = crud.device_data_log.delete_device_data_log(db, log_id)
        if not success:
            raise HTTPException(status_code=404, detail="设备数据日志不存在")
        return {"message": "设备数据日志已删除", "log_id": log_id}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in delete_device_data_log: {error_detail}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


# ==================== 统计接口 ====================

@router.get("/statistics/overview", response_model=Dict[str, Any])
def get_device_data_statistics(
    device_id: Optional[int] = Query(None, description="设备ID（可选，不传则统计所有设备）"),
    start_timestamp: Optional[int] = Query(None, description="起始时间戳"),
    end_timestamp: Optional[int] = Query(None, description="结束时间戳"),
    db: Session = Depends(get_db)
):
    """
    获取设备数据统计信息
    
    - **device_id**: 可选，指定设备ID，不传则统计所有设备
    - **start_timestamp**: 可选，起始时间戳
    - **end_timestamp**: 可选，结束时间戳
    
    返回统计信息包括：
    - 总记录数
    - 跌倒次数和跌倒率
    - 平均电池电量
    - WiFi和服务器连接状态统计
    - 位置质量分布
    """
    try:
        stats = crud.device_data_log.get_device_data_statistics(
            db, device_id, start_timestamp, end_timestamp
        )
        return stats
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in get_device_data_statistics: {error_detail}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


@router.get("/statistics/falls-by-device", response_model=List[Dict[str, Any]])
def get_fall_statistics_by_device(
    start_timestamp: Optional[int] = Query(None, description="起始时间戳"),
    end_timestamp: Optional[int] = Query(None, description="结束时间戳"),
    db: Session = Depends(get_db)
):
    """
    按设备统计跌倒数据
    
    - **start_timestamp**: 可选，起始时间戳
    - **end_timestamp**: 可选，结束时间戳
    
    返回每个设备的跌倒统计信息：
    - 设备ID、设备类型、设备名称
    - 跌倒次数
    - 平均置信度
    - 最新跌倒时间
    """
    try:
        stats = crud.device_data_log.get_fall_statistics_by_device(
            db, start_timestamp, end_timestamp
        )
        return stats
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in get_fall_statistics_by_device: {error_detail}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


@router.get("/device/{device_id}/time-series", response_model=List[Dict[str, Any]])
def get_device_data_time_series(
    device_id: int,
    start_timestamp: int = Query(..., description="起始时间戳"),
    end_timestamp: int = Query(..., description="结束时间戳"),
    interval_minutes: int = Query(60, ge=1, le=1440, description="时间间隔（分钟，默认60分钟）"),
    db: Session = Depends(get_db)
):
    """
    获取设备数据时间序列（用于图表展示）
    
    - **device_id**: 设备ID
    - **start_timestamp**: 起始时间戳（必填）
    - **end_timestamp**: 结束时间戳（必填）
    - **interval_minutes**: 时间间隔（分钟，默认60分钟，最大1440分钟）
    
    返回按时间间隔分组的数据，包括：
    - 时间戳
    - 记录数
    - 平均加速度（X、Y、Z轴）
    - 平均电池电量
    - 跌倒次数
    """
    try:
        if start_timestamp >= end_timestamp:
            raise HTTPException(status_code=400, detail="起始时间戳必须小于结束时间戳")
        
        data = crud.device_data_log.get_device_data_by_time_range(
            db, device_id, start_timestamp, end_timestamp, interval_minutes
        )
        return data
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in get_device_data_time_series: {error_detail}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


# ==================== 老者详情搜索接口 ====================

@router.get("/search-elder-detail", response_model=List[ElderDetailResponse])
def search_elder_detail(
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回记录数"),
    device_id: Optional[int] = Query(None, description="筛选设备ID"),
    elderly_user_id: Optional[int] = Query(None, description="筛选老者用户ID"),
    elderly_name: Optional[str] = Query(None, description="筛选老者姓名（模糊匹配）"),
    is_fall_confirmed: Optional[bool] = Query(None, description="筛选是否确认跌倒"),
    start_timestamp: Optional[int] = Query(None, description="起始时间戳"),
    end_timestamp: Optional[int] = Query(None, description="结束时间戳"),
    db: Session = Depends(get_db)
):
    """
    搜索老者详情
    
    联查 device_data_log、device 和 user 表，获取包含设备信息和老者信息的数据日志。
    
    **查询参数**:
    - **skip**: 跳过记录数（分页）
    - **limit**: 返回记录数（分页）
    - **device_id**: 可选，筛选特定设备
    - **elderly_user_id**: 可选，筛选特定老者用户ID
    - **elderly_name**: 可选，筛选老者姓名（支持模糊匹配）
    - **is_fall_confirmed**: 可选，筛选是否确认跌倒
    - **start_timestamp**: 可选，起始时间戳
    - **end_timestamp**: 可选，结束时间戳
    
    **返回数据包括**:
    - 设备数据日志的所有字段
    - 设备信息（设备名称、类型、状态、MAC地址、部署位置等）
    - 老者信息（用户ID、姓名、年龄、性别等）
    
    **使用示例**:
    - 按老者姓名搜索: `/search-elder-detail?elderly_name=张三`
    - 按设备ID和老者ID搜索: `/search-elder-detail?device_id=1&elderly_user_id=5`
    - 搜索跌倒记录: `/search-elder-detail?is_fall_confirmed=true&elderly_name=李四`
    """
    try:
        logs = crud.device_data_log.search_elder_detail(
            db=db,
            skip=skip,
            limit=limit,
            device_id=device_id,
            elderly_user_id=elderly_user_id,
            elderly_name=elderly_name,
            is_fall_confirmed=is_fall_confirmed,
            start_timestamp=start_timestamp,
            end_timestamp=end_timestamp
        )
        return [log_to_elder_detail_response(log) for log in logs]
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in search_elder_detail: {error_detail}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


