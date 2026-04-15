"""
TCP服务器服务
用于接收ESP32设备发送的IMU传感器数据
"""
import socket
import threading
import json
import re
from datetime import datetime
from typing import Optional, Callable
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import crud
from app.schemas.device_data_log import DeviceDataLogCreate
from app.api.routes.data_reception import convert_imu_data_to_device_data_log


class TCPServer:
    """TCP服务器类，用于接收ESP32数据"""
    
    def __init__(self, host: str = '0.0.0.0', port: int = 8080):
        self.host = host
        self.port = port
        self.server_socket: Optional[socket.socket] = None
        self.is_running = False
        self.server_thread: Optional[threading.Thread] = None
        self.total_samples = 0
        self.errors = 0
        self.last_receive_time: Optional[str] = None
        self.on_data_received: Optional[Callable] = None
        self._active_client_count = 0  # 當前連接的設備數量，用於前端顯示「設備已連接」
        
    def start(self):
        """启动TCP服务器"""
        if self.is_running:
            return {"status": "already_running", "message": "TCP服务器已在运行"}
        
        try:
            self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.server_socket.settimeout(2.0)
            self.server_socket.bind((self.host, self.port))
            self.server_socket.listen(5)
            
            self.is_running = True
            self.server_thread = threading.Thread(target=self._server_loop, daemon=True)
            self.server_thread.start()
            
            return {
                "status": "started",
                "message": f"TCP服务器已启动在 {self.host}:{self.port}",
                "host": self.host,
                "port": self.port
            }
        except Exception as e:
            self.is_running = False
            return {
                "status": "error",
                "message": f"启动TCP服务器失败: {str(e)}"
            }
    
    def stop(self):
        """停止TCP服务器"""
        if not self.is_running:
            return {"status": "not_running", "message": "TCP服务器未运行"}
        
        try:
            self.is_running = False
            if self.server_socket:
                self.server_socket.close()
                self.server_socket = None
            
            return {
                "status": "stopped",
                "message": "TCP服务器已停止"
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"停止TCP服务器失败: {str(e)}"
            }
    
    def get_status(self):
        """获取服务器状态"""
        return {
            "is_running": self.is_running,
            "host": self.host,
            "port": self.port,
            "total_samples": self.total_samples,
            "errors": self.errors,
            "last_receive_time": self.last_receive_time,
            "active_client_count": self._active_client_count,
        }
    
    def _server_loop(self):
        """服务器主循环"""
        print(f"🚀 TCP服务器启动在 {self.host}:{self.port}")
        print("等待ESP32设备连接...")
        
        while self.is_running:
            try:
                client_socket, client_address = self.server_socket.accept()
                self._active_client_count += 1
                print(f"📱 设备已连接: {client_address}")
                
                # 在新线程中处理客户端连接
                client_thread = threading.Thread(
                    target=self._handle_client,
                    args=(client_socket, client_address),
                    daemon=True
                )
                client_thread.start()
                
            except socket.timeout:
                continue  # 超时继续检查停止状态
            except OSError:
                if self.is_running:
                    print("❌ Socket错误，服务器可能已关闭")
                break
            except Exception as e:
                if self.is_running:
                    print(f"❌ 接受连接错误: {e}")
        
        print("TCP服务器已关闭")
    
    def _handle_client(self, client_socket: socket.socket, client_address):
        """处理客户端连接"""
        try:
            client_socket.settimeout(15.0)  # 延长超时到15秒
            buffer = ""
            request_complete = False
            
            while self.is_running and not request_complete:
                try:
                    # 循环接收数据，直到获取完整的HTTP请求
                    data = client_socket.recv(8192).decode('utf-8')
                    if not data:
                        break
                    
                    buffer += data
                    print(f"📥 累计接收数据长度: {len(buffer)}")
                    
                    # 检查是否包含HTTP请求的分隔符（头与体之间的空行）
                    if "\r\n\r\n" in buffer:
                        # 拆分请求头和JSON体
                        header_part, json_part = buffer.split("\r\n\r\n", 1)
                        print(f"✅ 成功拆分HTTP请求")
                        print(f"   请求头长度: {len(header_part)}, JSON体长度: {len(json_part)}")
                        print(f"   请求头预览: {header_part[:200]}")
                        
                        # 仅将JSON体传入解析函数（确保JSON体非空）
                        if json_part.strip():
                            receive_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
                            success = self._process_data(json_part, receive_time)
                            
                            if success:
                                # 发送HTTP 200响应，让ESP32确认上传成功
                                response = "HTTP/1.1 200 OK\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
                                client_socket.send(response.encode('utf-8'))
                                print("✅ 发送HTTP 200响应给ESP32")
                            else:
                                # 发送HTTP 400错误响应
                                response = "HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
                                client_socket.send(response.encode('utf-8'))
                                print("❌ 发送HTTP 400错误响应")
                        else:
                            print("⚠️ JSON体为空，跳过处理")
                        
                        request_complete = True
                        break
                    # 如果缓冲区看起来像纯JSON（以 { 开头），尝试直接解析
                    elif buffer.strip().startswith('{') and len(buffer) > 10:
                        # 可能是纯JSON格式，没有HTTP头
                        print("⚠️ 检测到可能是纯JSON格式（无HTTP头），尝试直接解析")
                        json_part = buffer.strip()
                        receive_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
                        success = self._process_data(json_part, receive_time)
                        
                        if success:
                            # 发送简单的确认响应
                            response = "OK\n"
                            client_socket.send(response.encode('utf-8'))
                            print("✅ 发送确认响应")
                        else:
                            print("❌ 处理失败")
                        
                        request_complete = True
                        break
                
                except socket.timeout:
                    print("⚠️ 接收超时，缓冲区内容开头: " + buffer[:100] + "...")
                    break
                except Exception as e:
                    print(f"❌ 接收数据错误: {e}")
                    break
        
        except Exception as e:
            print(f"❌ 客户端处理错误: {e}")
        finally:
            self._active_client_count = max(0, self._active_client_count - 1)
            client_socket.close()
            print(f"📱 设备连接已断开: {client_address}")
    
    def _process_data(self, json_part: str, receive_time: str) -> bool:
        """解析JSON请求体并保存到数据库"""
        try:
            # 清理JSON字符串（移除可能的空白字符）
            json_part = json_part.strip()
            
            # 尝试解析JSON
            try:
                data = json.loads(json_part)
                print(f"📝 解析JSON数据成功")
                print(f"   数据键: {list(data.keys())}")
            except json.JSONDecodeError as e:
                # 临时容错：去掉紧跟 } 或 ] 的多余逗号（非标准 JSON 常见错误）
                cleaned = re.sub(r",\s*([}\]])", r"\1", json_part)
                if cleaned != json_part:
                    try:
                        data = json.loads(cleaned)
                        print("⚠️ TCP 收到非标准 JSON（已清洗 trailing comma 后解析成功）")
                        print(f"   数据键: {list(data.keys())}")
                    except json.JSONDecodeError:
                        print(f"❌ JSON解析错误: {e}")
                        print(f"   错误位置: 行 {e.lineno}, 列 {e.colno}")
                        print(f"   原始数据前200字符: {json_part[:200]}")
                        print(f"   原始数据后200字符: {json_part[-200:] if len(json_part) > 200 else json_part}")
                        self.errors += 1
                        return False
                else:
                    print(f"❌ JSON解析错误: {e}")
                    print(f"   错误位置: 行 {e.lineno}, 列 {e.colno}")
                    print(f"   原始数据前200字符: {json_part[:200]}")
                    print(f"   原始数据后200字符: {json_part[-200:] if len(json_part) > 200 else json_part}")
                    self.errors += 1
                    return False
            
            # 添加服务器接收时间
            data['server_receive_time'] = receive_time
            
            # 检查并处理device_id
            if 'device_id' not in data or data['device_id'] is None:
                data['device_id'] = 1
                print("⚠️ 数据中未找到device_id，使用默认值1")
            else:
                device_id = int(data['device_id'])
                print(f"📱 设备ID: {device_id}")
                # 验证设备是否存在
                db_check: Session = SessionLocal()
                try:
                    from app.models.device import Device
                    device = db_check.query(Device).filter(Device.device_id == device_id).first()
                    if not device:
                        print(f"❌ 错误：设备ID {device_id} 在数据库中不存在")
                        print(f"   提示：请先在数据库中创建该设备，或修改ESP32代码使用已存在的设备ID")
                        self.errors += 1
                        return False
                    else:
                        print(f"✅ 设备ID {device_id} 验证通过")
                finally:
                    db_check.close()
            
            # 转换数据格式
            try:
                log_data = convert_imu_data_to_device_data_log(data)
                print(f"✅ 数据格式转换成功")
            except ValueError as e:
                print(f"❌ 数据格式转换失败: {e}")
                print(f"   接收到的数据: {json.dumps(data, indent=2, ensure_ascii=False)}")
                self.errors += 1
                return False
            except Exception as e:
                print(f"❌ 数据格式转换异常: {e}")
                import traceback
                print(f"   错误详情: {traceback.format_exc()}")
                self.errors += 1
                return False
            
            # 保存到数据库（确认跌倒时 1 分钟内同一设备只创建一次事件）
            db: Session = SessionLocal()
            try:
                new_log, _ = crud.device_data_log.create_device_data_log(db, log_data)
                self.total_samples += 1
                self.last_receive_time = receive_time
                print(f"✅ 数据已保存到数据库 (日志ID: {new_log.id}, 总样本数: {self.total_samples})")
                # 上行原始 JSON 写入 MongoDB 缓存（同步封装，失败不影响主流程）
                try:
                    from app.services.mongo_raw_upstream import run_sync_save_raw_upstream
                    run_sync_save_raw_upstream(data)
                except Exception as e:
                    print(f"⚠️ MongoDB 写入上行缓存失败: {e}")
                return True
            except ValueError as e:
                db.rollback()
                error_msg = str(e)
                print(f"❌ 保存数据到数据库失败（验证错误）: {error_msg}")
                if "设备不存在" in error_msg:
                    print(f"   解决方案：请确保设备ID {data.get('device_id')} 在数据库中存在")
                self.errors += 1
                return False
            except Exception as e:
                db.rollback()
                print(f"❌ 保存数据到数据库失败（数据库错误）: {e}")
                import traceback
                print(f"   错误详情: {traceback.format_exc()}")
                self.errors += 1
                return False
            finally:
                db.close()
                
        except Exception as e:
            print(f"❌ 处理数据时发生未预期错误: {e}")
            import traceback
            print(f"   错误详情: {traceback.format_exc()}")
            print(f"   原始数据: {json_part[:500]}")
            self.errors += 1
            return False


# 全局TCP服务器实例
_tcp_server: Optional[TCPServer] = None


def get_tcp_server(host: str = '0.0.0.0', port: int = 8080) -> TCPServer:
    """获取全局TCP服务器实例"""
    global _tcp_server
    if _tcp_server is None:
        _tcp_server = TCPServer(host=host, port=port)
    return _tcp_server

