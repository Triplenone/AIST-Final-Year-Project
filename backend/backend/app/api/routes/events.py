"""
事件API路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app import crud
from app.schemas.event import EventCreate, EventUpdate, EventResponse

router = APIRouter()


@router.get("/", response_model=List[EventResponse])
def get_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    related_user_id: Optional[int] = Query(None, description="关联用户ID筛选"),
    event_type: Optional[str] = Query(None, description="事件类型筛选"),
    event_status: Optional[str] = Query(None, description="事件状态筛选"),
    start_time: Optional[datetime] = Query(None, description="开始时间"),
    end_time: Optional[datetime] = Query(None, description="结束时间"),
    db: Session = Depends(get_db)
):
    """获取事件列表"""
    try:
        events = crud.event.get_events(
            db, skip=skip, limit=limit,
            related_user_id=related_user_id,
            event_type=event_type,
            event_status=event_status,
            start_time=start_time,
            end_time=end_time
        )
        
        # 安全转换事件数据
        from app.models.event import EventType, EventStatus
        result = []
        for event in events:
            # 安全处理枚举值
            event_type_value = None
            if event.event_type:
                try:
                    if isinstance(event.event_type, EventType):
                        event_type_value = event.event_type.value
                    elif isinstance(event.event_type, str):
                        event_type_value = event.event_type
                    else:
                        event_type_value = event.event_type.value if hasattr(event.event_type, 'value') else str(event.event_type)
                except (AttributeError, ValueError):
                    event_type_value = str(event.event_type) if event.event_type else None
            
            event_status_value = None
            if event.event_status:
                try:
                    if isinstance(event.event_status, EventStatus):
                        event_status_value = event.event_status.value
                    elif isinstance(event.event_status, str):
                        event_status_value = event.event_status
                    else:
                        event_status_value = event.event_status.value if hasattr(event.event_status, 'value') else str(event.event_status)
                except (AttributeError, ValueError):
                    event_status_value = str(event.event_status) if event.event_status else None
            
            # 创建响应对象
            event_dict = {
                "event_id": event.event_id,
                "event_type": event_type_value or "fall",
                "related_user_id": event.related_user_id,
                "trigger_device_id": event.trigger_device_id,
                "location_zone_id": event.location_zone_id,
                "event_timestamp": event.event_timestamp,
                "event_params": event.event_params,
                "event_status": event_status_value or "unhandled",
                "handled_by": event.handled_by,
                "handled_at": event.handled_at,
                "remark": event.remark
            }
            result.append(EventResponse(**event_dict))
        
        return result
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in get_events: {error_detail}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    """根据ID获取事件"""
    try:
        event = crud.event.get_event(db, event_id=event_id)
        if not event:
            raise HTTPException(status_code=404, detail="事件不存在")
        
        # 安全处理枚举值
        from app.models.event import EventType, EventStatus
        
        event_type_value = None
        if event.event_type:
            try:
                if isinstance(event.event_type, EventType):
                    event_type_value = event.event_type.value
                elif isinstance(event.event_type, str):
                    event_type_value = event.event_type
                else:
                    event_type_value = event.event_type.value if hasattr(event.event_type, 'value') else str(event.event_type)
            except (AttributeError, ValueError):
                event_type_value = str(event.event_type) if event.event_type else None
        
        event_status_value = None
        if event.event_status:
            try:
                if isinstance(event.event_status, EventStatus):
                    event_status_value = event.event_status.value
                elif isinstance(event.event_status, str):
                    event_status_value = event.event_status
                else:
                    event_status_value = event.event_status.value if hasattr(event.event_status, 'value') else str(event.event_status)
            except (AttributeError, ValueError):
                event_status_value = str(event.event_status) if event.event_status else None
        
        event_dict = {
            "event_id": event.event_id,
            "event_type": event_type_value or "fall",
            "related_user_id": event.related_user_id,
            "trigger_device_id": event.trigger_device_id,
            "location_zone_id": event.location_zone_id,
            "event_timestamp": event.event_timestamp,
            "event_params": event.event_params,
            "event_status": event_status_value or "unhandled",
            "handled_by": event.handled_by,
            "handled_at": event.handled_at,
            "remark": event.remark
        }
        return EventResponse(**event_dict)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in get_event: {error_detail}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


@router.post("/", response_model=EventResponse, status_code=201)
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    """创建事件"""
    return crud.event.create_event(db=db, event=event)


@router.put("/{event_id}", response_model=EventResponse)
def update_event(event_id: int, event_update: EventUpdate, db: Session = Depends(get_db)):
    """更新事件"""
    event = crud.event.update_event(db=db, event_id=event_id, event_update=event_update)
    if not event:
        raise HTTPException(status_code=404, detail="事件不存在")
    return event


@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: int, db: Session = Depends(get_db)):
    """删除事件"""
    success = crud.event.delete_event(db=db, event_id=event_id)
    if not success:
        raise HTTPException(status_code=404, detail="事件不存在")
    return None


@router.put("/{event_id}/handle", response_model=EventResponse)
def handle_event(
    event_id: int,
    event_status: str = Query(..., description="事件状态: resolved 或 unhandled"),
    handled_by: Optional[int] = Query(None, description="处理人ID"),
    remark: Optional[str] = Query(None, description="处理备注"),
    db: Session = Depends(get_db)
):
    """处理事件（更新事件状态）"""
    from app.models.event import EventStatus
    from datetime import datetime
    
    event = crud.event.get_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="事件不存在")
    
    # 验证状态值
    if event_status not in ['resolved', 'unhandled', 'confirmed', 'false_alarm']:
        raise HTTPException(status_code=400, detail="无效的事件状态")
    
    # 更新事件状态
    try:
        event.event_status = EventStatus(event_status)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的事件状态")
    
    if event_status == 'resolved' or event_status == 'confirmed' or event_status == 'false_alarm':
        event.handled_at = datetime.now()
        if handled_by:
            event.handled_by = handled_by
    else:
        event.handled_at = None
        event.handled_by = None
    
    if remark is not None:
        event.remark = remark
    
    db.commit()
    db.refresh(event)
    return event