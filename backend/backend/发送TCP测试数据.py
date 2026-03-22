#!/usr/bin/env python3
"""
向本机 TCP 8080 端口发送一条测试数据，用于验证「启动接收」后后端是否在接收并落库。
运行前请确保：1）后端已启动；2）前端已点击「启动接收」；3）数据库中存在 device_id=1（或修改下方 device_id）。
"""
import json
import socket

HOST = "127.0.0.1"
PORT = 8080
# 若数据库中设备 ID 不是 1，请改为实际存在的 device_id
DEVICE_ID = 1

payload = {
    "device_id": DEVICE_ID,
    "timestamp": 1735123456,
    "relative_time": 1735123456,
    "accelerometer": {"x": 0.02, "y": -0.01, "z": 1.0},
    "gyroscope": {"x": 0.1, "y": -0.05, "z": 0.02},
    "fall_detection": {
        "state": 0,
        "state_description": "正常",
        "confidence": 0.1,
        "is_fall_confirmed": False,
        "impact_force": 0,
        "direction": "",
        "fall_time": 0,
    },
    "system_status": {
        "wifi_connected": True,
        "server_connected": True,
        "battery_level": 85,
    },
}

body = json.dumps(payload, ensure_ascii=False)

def main():
    print(f"连接 {HOST}:{PORT} 并发送测试数据（device_id={DEVICE_ID}）...")
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(10)
        s.connect((HOST, PORT))
        s.send(body.encode("utf-8"))
        s.shutdown(socket.SHUT_WR)
        reply = s.recv(1024).decode("utf-8", errors="ignore")
        s.close()
        print("发送成功。服务器响应:", repr(reply))
        print("请在前端设备日志页查看是否新增一条记录。")
    except ConnectionRefusedError:
        print("连接被拒绝。请确认：1）后端已启动；2）前端已点击「启动接收」使 TCP 服务在 8080 监听。")
    except Exception as e:
        print("错误:", e)

if __name__ == "__main__":
    main()
