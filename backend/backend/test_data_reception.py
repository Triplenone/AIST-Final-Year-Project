"""
数据接收功能测试脚本
用于测试 /api/v1/data-reception/receive 接口
"""
import requests
import json
import time
from datetime import datetime

API_BASE_URL = "http://localhost:8000/api/v1/data-reception"

def send_test_data(device_id=1, is_fall=False):
    """发送测试数据"""
    now = int(time.time())
    
    data = {
        "device_id": device_id,
        "timestamp": now,
        "relative_time": now,
        "accelerometer": {
            "x": 2.456 if is_fall else 0.123,
            "y": -1.234 if is_fall else -0.046,
            "z": 9.876 if is_fall else 1.023
        },
        "gyroscope": {
            "x": 15.234 if is_fall else 1.254,
            "y": -8.765 if is_fall else -0.754,
            "z": 12.345 if is_fall else 0.325
        },
        "location": {
            "x": 2.35,
            "y": 3.67,
            "z": 0.5 if is_fall else 0,
            "accuracy": 1.25,
            "position_quality": "high" if is_fall else "medium"
        },
        "fall_detection": {
            "state": 4 if is_fall else 0,
            "state_description": "确认跌倒" if is_fall else "正常",
            "confidence": 0.95 if is_fall else 0.15,
            "is_fall_confirmed": is_fall,
            "impact_force": 6.80 if is_fall else 0.0,
            "direction": "前" if is_fall else "",
            "fall_time": now if is_fall else 0
        },
        "system_status": {
            "wifi_connected": True,
            "server_connected": True,
            "battery_level": 85
        }
    }
    
    try:
        print(f"\n📤 发送数据 (设备ID: {device_id}, 跌倒: {is_fall})...")
        response = requests.post(
            f"{API_BASE_URL}/receive",
            json=data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        response.raise_for_status()
        result = response.json()
        print(f"✅ 数据接收成功!")
        print(f"   日志ID: {result.get('log_id')}")
        print(f"   消息: {result.get('message')}")
        if result.get('event_created'):
            print(f"   🚨 已自动创建待处理事件!")
        return result
    except requests.exceptions.RequestException as e:
        print(f"❌ 数据接收失败: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = e.response.json()
                print(f"   错误详情: {json.dumps(error_detail, indent=2, ensure_ascii=False)}")
            except:
                print(f"   错误详情: {e.response.text}")
        return None

def check_status():
    """检查服务状态"""
    try:
        print("\n📊 检查服务状态...")
        response = requests.get(f"{API_BASE_URL}/status", timeout=5)
        response.raise_for_status()
        result = response.json()
        print(f"✅ 服务状态: {result.get('status')}")
        print(f"   服务名称: {result.get('service')}")
        print(f"   描述: {result.get('description')}")
        print(f"   端点: {result.get('method')} {result.get('endpoint')}")
        return result
    except requests.exceptions.RequestException as e:
        print(f"❌ 获取状态失败: {e}")
        return None

def test_batch_send(count=5, device_id=1):
    """批量发送测试数据"""
    print(f"\n📦 批量发送 {count} 条测试数据...")
    success = 0
    failed = 0
    
    for i in range(count):
        is_fall = (i == count - 1)  # 最后一条是跌倒数据
        result = send_test_data(device_id=device_id, is_fall=is_fall)
        if result:
            success += 1
        else:
            failed += 1
        time.sleep(0.5)  # 避免请求过快
    
    print(f"\n📊 批量发送结果:")
    print(f"   成功: {success}/{count}")
    print(f"   失败: {failed}/{count}")

if __name__ == "__main__":
    print("=" * 60)
    print("数据接收功能测试")
    print("=" * 60)
    
    # 1. 检查服务状态
    check_status()
    
    # 2. 发送正常数据
    print("\n" + "=" * 60)
    print("测试1: 发送正常数据")
    print("=" * 60)
    send_test_data(device_id=1, is_fall=False)
    
    time.sleep(1)
    
    # 3. 发送跌倒数据（会自动创建事件）
    print("\n" + "=" * 60)
    print("测试2: 发送跌倒数据（会自动创建事件）")
    print("=" * 60)
    send_test_data(device_id=1, is_fall=True)
    
    # 4. 批量发送测试
    print("\n" + "=" * 60)
    print("测试3: 批量发送测试")
    print("=" * 60)
    test_batch_send(count=5, device_id=1)
    
    print("\n" + "=" * 60)
    print("✅ 测试完成！")
    print("=" * 60)
    print("\n请检查：")
    print("1. 数据库 device_data_log 表中是否有新数据")
    print("2. 如果发送了跌倒数据，event 表中是否有新事件")
    print("3. 前端'设备数据日志'页面是否显示新数据")
    print("4. 前端'事件管理'页面是否显示新事件（如果是跌倒数据）")

