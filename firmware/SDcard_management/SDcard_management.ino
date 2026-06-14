#include <SD_MMC.h>
#include <WiFi.h>
#include <WebServer.h>
#include <FS.h>

const char* ssid = "MILLION";
const char* password = "wml6949619";

WebServer server(80);
File currentFile;
bool sdCardOK = false;

// 需要创建的文件夹列表
const char* folders[] = {
    "/alerts",
    "/tts",
    "/nav",
    "/icons",
    "/messages",
    "/tiles"
};
const int folderCount = sizeof(folders) / sizeof(folders[0]);

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("\n========================================");
    Serial.println("=== ESP32 SD卡 WiFi 上传工具 ===");
    Serial.println("========================================\n");
    
    // 初始化 SD 卡
    pinMode(43, OUTPUT);
    digitalWrite(43, LOW);  // 使能 SD 卡供电（根据你的硬件调整）
    delay(100);
    
    SD_MMC.setPins(47, 38, 48);  // CLK, CMD, DATA
    
    if (!SD_MMC.begin("/sdcard", true)) {
        Serial.println("❌ SD 卡初始化失败！");
        Serial.println("   请检查:");
        Serial.println("   1. SD卡是否插入");
        Serial.println("   2. 引脚连接是否正确");
        Serial.println("   3. SD卡格式是否为FAT32");
        sdCardOK = false;
    } else {
        Serial.println("✅ SD 卡初始化成功");
        sdCardOK = true;
        
        // 创建必要的文件夹
        createFolders();
        
        // 列出所有文件
        Serial.println("\n📁 SD卡当前内容:");
        listAllFiles("/", 0);
    }
    
    // 创建 WiFi 热点（无论SD卡是否成功都启动，方便调试）
    WiFi.softAP(ssid, password);
    Serial.println("\n🌐 WiFi 热点已创建");
    Serial.printf("   SSID: %s\n", ssid);
    Serial.printf("   密码: %s\n", password);
    Serial.printf("   访问IP: %s\n", WiFi.softAPIP().toString().c_str());
    
    // 配置网页路由
    server.on("/", HTTP_GET, handleRoot);
    server.on("/upload", HTTP_POST, handleUploadComplete, handleFileUpload);
    server.on("/uploadTo", HTTP_POST, handleUploadComplete, handleFileUploadToFolder);
    server.on("/list", HTTP_GET, handleListFiles);
    server.on("/listFolder", HTTP_GET, handleListFolder);
    server.on("/delete", HTTP_GET, handleDeleteFile);
    server.on("/createFolder", HTTP_GET, handleCreateFolder);
    server.on("/folders", HTTP_GET, handleFolders);
    
    server.begin();
    Serial.println("✅ Web服务器已启动\n");
    
    Serial.println("=== 使用说明 ===");
    Serial.println("📱 Web方式:");
    Serial.println("   1. 连接 WiFi: ESP32_SD_Upload");
    Serial.println("   2. 浏览器打开: 192.168.4.1");
    Serial.println("   3. 上传文件/创建文件夹\n");
    Serial.println("💻 串口命令:");
    Serial.println("   输入 'list' - 查看所有文件");
    Serial.println("   输入 'help' - 显示帮助");
    Serial.println("========================================\n");
}

void loop() {
    server.handleClient();
    
    // 处理串口命令
    if (Serial.available()) {
        String cmd = Serial.readStringUntil('\n');
        cmd.trim();
        cmd.toLowerCase();
        
        if (cmd == "list") {
            if (sdCardOK) {
                Serial.println("\n📁 SD卡完整目录树:");
                listAllFiles("/", 0);
                Serial.println();
            } else {
                Serial.println("❌ SD卡未就绪，无法列出文件\n");
            }
        } 
        else if (cmd == "help") {
            Serial.println("\n📖 可用命令:");
            Serial.println("   list  - 列出SD卡所有文件和文件夹");
            Serial.println("   help  - 显示此帮助");
            Serial.println("   status - 显示SD卡状态");
            Serial.println();
        }
        else if (cmd == "status") {
            Serial.printf("\n📊 SD卡状态: %s\n", sdCardOK ? "✅ 就绪" : "❌ 未就绪");
            if (sdCardOK) {
                // 获取总容量和剩余容量（简化版本）
                Serial.println("   (容量信息需要SD卡格式化后查看)");
            }
            Serial.println();
        }
        else if (cmd.length() > 0) {
            Serial.printf("❌ 未知命令: %s\n输入 'help' 查看可用命令\n", cmd.c_str());
        }
    }
}

// ========== SD卡功能函数 ==========

// 递归列出所有文件和文件夹
void listAllFiles(String path, int depth) {
    File root = SD_MMC.open(path);
    if (!root) {
        Serial.printf("❌ 无法打开目录: %s\n", path.c_str());
        return;
    }
    
    File file = root.openNextFile();
    int fileCount = 0;
    int folderCount = 0;
    
    while (file) {
        // 添加缩进
        String indent = "";
        for (int i = 0; i < depth; i++) indent += "  ";
        
        if (file.isDirectory()) {
            Serial.printf("%s📁 %s/\n", indent.c_str(), file.name());
            folderCount++;
            // 递归进入子文件夹
            String subPath = path;
            if (!subPath.endsWith("/")) subPath += "/";
            subPath += file.name();
            listAllFiles(subPath, depth + 1);
        } else {
            // 获取文件大小并格式化显示
            size_t fileSize = file.size();
            String sizeStr;
            if (fileSize < 1024) {
                sizeStr = String(fileSize) + " B";
            } else if (fileSize < 1024 * 1024) {
                sizeStr = String(fileSize / 1024) + " KB";
            } else {
                sizeStr = String(fileSize / 1024 / 1024) + " MB";
            }
            Serial.printf("%s📄 %s (%s)\n", indent.c_str(), file.name(), sizeStr.c_str());
            fileCount++;
        }
        file = root.openNextFile();
    }
    root.close();
    
    if (depth == 0 && fileCount == 0 && folderCount == 0) {
        Serial.println("  (SD卡为空)");
    }
}

// 创建文件夹
void createFolders() {
    Serial.println("\n📁 创建文件夹...");
    for (int i = 0; i < folderCount; i++) {
        if (SD_MMC.exists(folders[i])) {
            Serial.printf("  %s ✅ 已存在\n", folders[i]);
        } else {
            if (SD_MMC.mkdir(folders[i])) {
                Serial.printf("  %s ✅ 创建成功\n", folders[i]);
            } else {
                Serial.printf("  %s ❌ 创建失败\n", folders[i]);
            }
        }
    }
}

// ========== Web页面 ==========

void handleRoot() {
    String html = "<!DOCTYPE html>";
    html += "<html>";
    html += "<head>";
    html += "<meta charset='UTF-8'>";
    html += "<meta name='viewport' content='width=device-width'>";
    html += "<title>SD卡文件管理器</title>";
    html += "<style>";
    html += "body{font-family:Arial;padding:20px;max-width:800px;margin:0 auto;background:#f5f5f5}";
    html += "h1{color:#333}";
    html += ".card{background:white;padding:20px;border-radius:10px;margin-bottom:20px;box-shadow:0 2px 5px rgba(0,0,0,0.1)}";
    html += ".btn{background:#4CAF50;color:white;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;margin:5px}";
    html += ".btn-danger{background:#f44336}";
    html += ".btn-primary{background:#2196F3}";
    html += ".file-list{margin-top:10px}";
    html += ".file-item{padding:8px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;align-items:center}";
    html += ".folder-item{padding:8px;background:#e8f0fe;margin:5px 0;border-radius:5px;display:flex;justify-content:space-between;align-items:center}";
    html += ".folder-name{font-weight:bold;color:#2196F3}";
    html += "input,select{padding:8px;margin:5px;border:1px solid #ddd;border-radius:5px}";
    html += ".status{background:#fff3cd;padding:10px;border-radius:5px;margin:10px 0}";
    html += "</style>";
    html += "</head>";
    html += "<body>";
    html += "<h1>📁 SD卡文件管理器</h1>";
    
    // SD卡状态
    if (!sdCardOK) {
        html += "<div class='status' style='background:#f8d7da;color:#721c24'>❌ SD卡未就绪，请检查SD卡是否插入</div>";
    } else {
        html += "<div class='status' style='background:#d4edda;color:#155724'>✅ SD卡已就绪</div>";
    }
    
    // 上传到根目录
    html += "<div class='card'>";
    html += "<h2>📤 上传到根目录</h2>";
    html += "<form method='post' action='/upload' enctype='multipart/form-data'>";
    html += "<input type='file' name='file' id='file' required>";
    html += "<input type='submit' value='上传' class='btn'>";
    html += "</form>";
    html += "</div>";
    
    // 上传到指定文件夹
    html += "<div class='card'>";
    html += "<h2>📂 上传到文件夹</h2>";
    html += "<form method='post' action='/uploadTo' enctype='multipart/form-data'>";
    html += "<select name='folder'>";
    for (int i = 0; i < folderCount; i++) {
        html += "<option value='" + String(folders[i]) + "'>" + String(folders[i]) + "</option>";
    }
    html += "<option value='/'>根目录</option>";
    html += "</select>";
    html += "<input type='file' name='file' required>";
    html += "<input type='submit' value='上传' class='btn'>";
    html += "</form>";
    html += "</div>";
    
    // 创建新文件夹
    html += "<div class='card'>";
    html += "<h2>📂 创建新文件夹</h2>";
    html += "<input type='text' id='newFolderName' placeholder='文件夹名称 (如: myfolder)'>";
    html += "<button onclick='createFolder()' class='btn btn-primary'>创建文件夹</button>";
    html += "<div id='createResult'></div>";
    html += "</div>";
    
    // 文件夹列表
    html += "<div class='card'>";
    html += "<h2>📁 文件夹列表</h2>";
    html += "<button onclick='loadFolders()' class='btn btn-primary'>刷新</button>";
    html += "<div id='folders'></div>";
    html += "</div>";
    
    // 文件列表
    html += "<div class='card'>";
    html += "<h2>📄 文件列表 (根目录)</h2>";
    html += "<button onclick='loadFiles()' class='btn btn-primary'>刷新</button>";
    html += "<div id='fileList'></div>";
    html += "</div>";
    
    // JavaScript
    html += "<script>";
    html += "function loadFiles() {";
    html += "  fetch('/list').then(r=>r.json()).then(data=>{";
    html += "    let html='<div class=file-list>';";
    html += "    if(data.files.length===0) html+='<p>暂无文件</p>';";
    html += "    data.files.forEach(f=>{";
    html += "      html+='<div class=file-item>📄 '+f.name+' ('+f.size+' bytes) <a href=/delete?file='+f.name+' style=color:red>删除</a></div>';";
    html += "    });";
    html += "    html+='</div>';";
    html += "    document.getElementById('fileList').innerHTML=html;";
    html += "  });";
    html += "}";
    html += "function loadFolders() {";
    html += "  fetch('/folders').then(r=>r.json()).then(data=>{";
    html += "    let html='<div class=file-list>';";
    html += "    if(data.folders.length===0) html+='<p>暂无文件夹</p>';";
    html += "    data.folders.forEach(f=>{";
    html += "      html+='<div class=folder-item>📁 <span class=folder-name>'+f+'</span> <div><a href=?folder='+f+' onclick=viewFolder(\\''+f+'\\')>查看文件</a> <a href=/delete?file='+f+' style=color:red>删除</a></div></div>';";
    html += "    });";
    html += "    html+='</div>';";
    html += "    document.getElementById('folders').innerHTML=html;";
    html += "  });";
    html += "}";
    html += "function createFolder() {";
    html += "  let name=document.getElementById('newFolderName').value;";
    html += "  if(!name){alert('请输入文件夹名称');return;}";
    html += "  fetch('/createFolder?name='+name).then(r=>r.text()).then(msg=>{";
    html += "    document.getElementById('createResult').innerHTML='<div style=color:green>'+msg+'</div>';";
    html += "    setTimeout(()=>document.getElementById('createResult').innerHTML='',3000);";
    html += "    loadFolders();";
    html += "    document.getElementById('newFolderName').value='';";
    html += "  });";
    html += "}";
    html += "function viewFolder(folder){";
    html += "  fetch('/listFolder?folder='+folder).then(r=>r.json()).then(data=>{";
    html += "    let msg='📂 '+folder+' 中的文件:\\n';";
    html += "    data.files.forEach(f=>{msg+=f.name+' ('+f.size+' bytes)\\n';});";
    html += "    if(data.files.length===0) msg+='(空文件夹)';";
    html += "    alert(msg);";
    html += "  });";
    html += "}";
    html += "loadFiles();";
    html += "loadFolders();";
    html += "</script>";
    
    html += "</body>";
    html += "</html>";
    
    server.send(200, "text/html", html);
}

// ========== 文件上传处理 ==========

void handleFileUpload() {
    if (!sdCardOK) {
        server.send(500, "text/plain", "SD卡未就绪");
        return;
    }
    
    HTTPUpload& upload = server.upload();
    
    if (upload.status == UPLOAD_FILE_START) {
        String filename = upload.filename;
        if (filename.indexOf('/') != -1) {
            filename = filename.substring(filename.lastIndexOf('/') + 1);
        }
        Serial.printf("📤 开始上传: %s\n", filename.c_str());
        
        currentFile = SD_MMC.open("/" + filename, FILE_WRITE);
        if (!currentFile) {
            Serial.println("❌ 无法创建文件");
        }
        
    } else if (upload.status == UPLOAD_FILE_WRITE) {
        if (currentFile) {
            currentFile.write(upload.buf, upload.currentSize);
        }
        
    } else if (upload.status == UPLOAD_FILE_END) {
        if (currentFile) {
            currentFile.close();
            Serial.printf("✅ 上传完成: %s (%d bytes)\n", 
                         upload.filename.c_str(), upload.totalSize);
        }
    }
}

void handleFileUploadToFolder() {
    if (!sdCardOK) {
        server.send(500, "text/plain", "SD卡未就绪");
        return;
    }
    
    HTTPUpload& upload = server.upload();
    static String targetFolder;
    
    if (upload.status == UPLOAD_FILE_START) {
        if (server.hasArg("folder")) {
            targetFolder = server.arg("folder");
        } else {
            targetFolder = "/";
        }
        
        String filename = upload.filename;
        if (filename.indexOf('/') != -1) {
            filename = filename.substring(filename.lastIndexOf('/') + 1);
        }
        
        String fullPath = targetFolder + "/" + filename;
        Serial.printf("📤 开始上传到: %s\n", fullPath.c_str());
        
        currentFile = SD_MMC.open(fullPath, FILE_WRITE);
        if (!currentFile) {
            Serial.println("❌ 无法创建文件");
        }
        
    } else if (upload.status == UPLOAD_FILE_WRITE) {
        if (currentFile) {
            currentFile.write(upload.buf, upload.currentSize);
        }
        
    } else if (upload.status == UPLOAD_FILE_END) {
        if (currentFile) {
            currentFile.close();
            Serial.printf("✅ 上传完成: %s\n", upload.filename.c_str());
        }
    }
}

void handleUploadComplete() {
    server.send(200, "text/html", "<script>alert('上传成功！');window.location.href='/';</script>");
}

// ========== API 处理函数 ==========

void handleListFiles() {
    if (!sdCardOK) {
        server.send(500, "application/json", "{\"files\":[]}");
        return;
    }
    
    String json = "{\"files\":[";
    File root = SD_MMC.open("/");
    File file = root.openNextFile();
    bool first = true;
    while (file) {
        if (!file.isDirectory()) {
            if (!first) json += ",";
            json += "{\"name\":\"" + String(file.name()) + "\",";
            json += "\"size\":" + String(file.size()) + "}";
            first = false;
        }
        file = root.openNextFile();
    }
    root.close();
    json += "]}";
    server.send(200, "application/json", json);
}

void handleListFolder() {
    if (!sdCardOK) {
        server.send(500, "application/json", "{\"files\":[]}");
        return;
    }
    
    if (server.hasArg("folder")) {
        String folder = server.arg("folder");
        String json = "{\"files\":[";
        File dir = SD_MMC.open(folder);
        if (dir && dir.isDirectory()) {
            File file = dir.openNextFile();
            bool first = true;
            while (file) {
                if (!first) json += ",";
                json += "{\"name\":\"" + String(file.name()) + "\",";
                json += "\"size\":" + String(file.size()) + "}";
                file = dir.openNextFile();
                first = false;
            }
        }
        dir.close();
        json += "]}";
        server.send(200, "application/json", json);
    } else {
        server.send(400, "text/plain", "缺少文件夹参数");
    }
}

void handleFolders() {
    if (!sdCardOK) {
        server.send(500, "application/json", "{\"folders\":[]}");
        return;
    }
    
    String json = "{\"folders\":[";
    File root = SD_MMC.open("/");
    File file = root.openNextFile();
    bool first = true;
    while (file) {
        if (file.isDirectory()) {
            if (!first) json += ",";
            json += "\"" + String(file.name()) + "\"";
            first = false;
        }
        file = root.openNextFile();
    }
    root.close();
    json += "]}";
    server.send(200, "application/json", json);
}

void handleCreateFolder() {
    if (!sdCardOK) {
        server.send(500, "text/plain", "SD卡未就绪");
        return;
    }
    
    if (server.hasArg("name")) {
        String folderName = server.arg("name");
        // 移除可能的路径分隔符
        folderName.replace("/", "");
        folderName.replace("\\", "");
        
        if (folderName.length() > 0) {
            String path = "/" + folderName;
            if (SD_MMC.exists(path)) {
                server.send(400, "text/plain", "文件夹已存在");
            } else if (SD_MMC.mkdir(path)) {
                Serial.printf("✅ 创建文件夹: %s\n", path.c_str());
                server.send(200, "text/plain", "✅ 文件夹创建成功: " + folderName);
            } else {
                server.send(500, "text/plain", "❌ 创建失败");
            }
        } else {
            server.send(400, "text/plain", "❌ 文件夹名称不能为空");
        }
    } else {
        server.send(400, "text/plain", "❌ 缺少文件夹名称");
    }
}

void handleDeleteFile() {
    if (!sdCardOK) {
        server.send(200, "text/html", "<script>alert('SD卡未就绪');window.location.href='/';</script>");
        return;
    }
    
    if (server.hasArg("file")) {
        String filename = server.arg("file");
        String path = "/" + filename;
        
        if (SD_MMC.remove(path)) {
            Serial.printf("✅ 删除文件: %s\n", path.c_str());
            server.send(200, "text/html", "<script>alert('删除成功！');window.location.href='/';</script>");
        } else if (SD_MMC.rmdir(path)) {
            Serial.printf("✅ 删除文件夹: %s\n", path.c_str());
            server.send(200, "text/html", "<script>alert('删除成功！');window.location.href='/';</script>");
        } else {
            server.send(200, "text/html", "<script>alert('删除失败！');window.location.href='/';</script>");
        }
    } else {
        server.send(200, "text/html", "<script>alert('缺少文件名');window.location.href='/';</script>");
    }
}