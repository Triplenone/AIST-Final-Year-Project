// AudioManager.cpp
#include "AudioManager.h"
#include "es8311.h"

extern ES8311 es8311;

// ================ 构造函数 ================
AudioManager::AudioManager() 
    : audio_initialized(false), volume(AUDIO_VOLUME_DEFAULT), es8311(nullptr) {}

// ================ 初始化 ================
bool AudioManager::init() {
    Serial.println("音频管理器初始化...");
    
    // ========== 重要：确保 SD 卡供电使能 ==========
    pinMode(43, OUTPUT);
    digitalWrite(43, LOW);   // 低电平使能 SD 卡供电
    delay(100);              // 等待 SD 卡上电稳定
    
    // 1. 初始化 ES8311
    es8311 = new ES8311();
    if (!es8311->begin(1, 2)) {
        Serial.println("❌ ES8311 初始化失败");
        return false;
    }
    Serial.println("✅ ES8311 初始化成功");
    
    // 2. 设置音量
    es8311->setVolume(volume);
    
    // 3. 设置采样率
    es8311->setSampleRate(SAMPLE_RATE);
    es8311->setBitsPerSample(BITS_PER_SAMPLE);
    es8311->setMode(true);
    
    // 4. 初始化 I2S
    initI2S();
    
    // 5. 使能功放
    pinMode(PA_ENABLE, OUTPUT);
    digitalWrite(PA_ENABLE, HIGH);
    
    audio_initialized = true;
    Serial.println("✅ 音频管理器初始化完成");
    
    // 6. 播放测试音
    playSineWave(1000, 300);
    
    return true;
}

// ================ I2S 初始化 ================
void AudioManager::initI2S() {
    i2s_config_t i2s_config = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
        .sample_rate = SAMPLE_RATE,
        .bits_per_sample = (i2s_bits_per_sample_t)BITS_PER_SAMPLE,
        .channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT,
        .communication_format = I2S_COMM_FORMAT_I2S,
        .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count = 8,
        .dma_buf_len = BUFFER_SIZE,
        .use_apll = false,
        .tx_desc_auto_clear = true,
        .fixed_mclk = 0
    };

    i2s_pin_config_t pin_config = {
        .mck_io_num = I2S_MCLK,
        .bck_io_num = I2S_BCLK,
        .ws_io_num = I2S_LRCLK,
        .data_out_num = I2S_DOUT,
        .data_in_num = I2S_PIN_NO_CHANGE
    };

    i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL);
    i2s_set_pin(I2S_NUM_0, &pin_config);
    i2s_set_sample_rates(I2S_NUM_0, SAMPLE_RATE);
    
    Serial.println("I2S 初始化完成");
}

// ================ 播放正弦波 ================
void AudioManager::playSineWave(uint16_t frequency, uint32_t duration) {
    if (!audio_initialized) return;
    
    uint32_t total_samples = (duration * SAMPLE_RATE) / 1000;
    int16_t* buffer = (int16_t*)malloc(total_samples * CHANNELS * sizeof(int16_t));
    
    for (uint32_t i = 0; i < total_samples; i++) {
        float t = (float)i / SAMPLE_RATE;
        float sine = sin(2 * PI * frequency * t);
        int16_t sample = (int16_t)(sine * 32767);
        buffer[i * 2] = sample;
        buffer[i * 2 + 1] = sample;
    }
    
    size_t bytes_written = 0;
    size_t buffer_size = total_samples * CHANNELS * sizeof(int16_t);
    i2s_write(I2S_NUM_0, buffer, buffer_size, &bytes_written, pdMS_TO_TICKS(100));
    
    free(buffer); 
    }

// ================ WAV 文件播放 ================
bool AudioManager::playWAVFile(const char* filename) {
    if (!audio_initialized) return false;
    
    // ⭐ 确保 SD 卡供电
    pinMode(43, OUTPUT);
    digitalWrite(43, LOW);
    delay(50);
    
    if (!SD_MMC.exists(filename)) {
        Serial.printf("文件不存在: %s\n", filename);
        return false;
    }
    
    File wavFile = SD_MMC.open(filename, FILE_READ);
    if (!wavFile) {
        Serial.println("无法打开 WAV 文件");
        return false;
    }
    
    // 读取 WAV 头
    uint8_t header[44];
    if (wavFile.read(header, 44) != 44) {
        Serial.println("读取 WAV 头失败");
        wavFile.close();
        return false;
    }
    
    // 验证 WAV 格式
    if (header[0] != 'R' || header[1] != 'I' || header[2] != 'F' || header[3] != 'F') {
        Serial.println("❌ 不是有效的 WAV 文件");
        wavFile.close();
        return false;
    }
    
    // ⭐ 使用内部 RAM 缓冲区
    uint8_t* buffer = (uint8_t*)malloc(1024);  // 减小缓冲区
    if (!buffer) {
        Serial.println("❌ 内存分配失败");
        wavFile.close();
        return false;
    }
    
    size_t bytesRead;
    size_t bytesWritten;
    
    while (wavFile.available()) {
        bytesRead = wavFile.read(buffer, 1024);
        if (bytesRead > 0) {
            i2s_write(I2S_NUM_0, buffer, bytesRead, &bytesWritten, pdMS_TO_TICKS(100));
        }
    }
    
    free(buffer);
    wavFile.close();
    return true;
}

// ================ 基础语音组件 ================
void AudioManager::playWord(const char* word) {
    char filename[64];
    snprintf(filename, sizeof(filename), "/voice/%s.wav", word);
    
    if (SD_MMC.exists(filename)) {
        playWAVFile(filename);
    } else {
        Serial.printf("⚠️ 语音文件不存在: %s\n", filename);
        playSineWave(600, 100);
    }
}

void AudioManager::playNumber(int num) {
    if (num < 0) return;
    
    char filename[64];
    
    // 1-20, 30, 40...100
    if (num <= 20 || (num % 10 == 0 && num <= 100)) {
        snprintf(filename, sizeof(filename), "/voice/num_%d.wav", num);
        if (SD_MMC.exists(filename)) {
            playWAVFile(filename);
            return;
        }
    }
    
    // 两位数 21-99
    if (num > 20 && num < 100) {
        int tens = (num / 10) * 10;
        int ones = num % 10;
        playNumber(tens);
        if (ones > 0) {
            delay(80);
            playNumber(ones);
        }
        return;
    }
    
    // 三位数 100-999
    if (num >= 100 && num < 1000) {
        int hundreds = num / 100;
        int remainder = num % 100;
        playNumber(hundreds);
        playWord("hundred");
        if (remainder > 0) {
            delay(80);
            playNumber(remainder);
        }
        return;
    }
    
    Serial.printf("⚠️ 未处理的数字: %d\n", num);
    playSineWave(600, 100);
}

void AudioManager::playLetter(char letter) {
    if (letter >= 'A' && letter <= 'Z') {
        char filename[64];
        snprintf(filename, sizeof(filename), "/voice/letter_%c.wav", letter);
        if (SD_MMC.exists(filename)) {
            playWAVFile(filename);
        } else {
            playSineWave(600, 100);
        }
    } else if (letter >= 'a' && letter <= 'z') {
        playLetter(letter - 'a' + 'A');
    }
}

void AudioManager::playDistance(int meters) {
    playNumber(meters);
    delay(80);
    playWord("meters");
}

void AudioManager::playDirection(const char* direction, int distance) {
    if (strcmp(direction, "left") == 0) {
        playWord("turn_left");
    } else if (strcmp(direction, "right") == 0) {
        playWord("turn_right");
    } else if (strcmp(direction, "straight") == 0) {
        playWord("go_straight");
    } else {
        playWord(direction);
    }
    
    if (distance > 0) {
        delay(100);
        playWord("in");
        delay(80);
        playDistance(distance);
    }
}

// ================ 导航专用 ================
void AudioManager::playNavigation(const char* instruction, int distance) {
    if (!audio_initialized) return;
    playDirection(instruction, distance);
}

void AudioManager::playGate(const char* gate) {
    if (!audio_initialized) return;
    
    playWord("gate");
    delay(80);
    
    for (int i = 0; i < strlen(gate); i++) {
        char c = gate[i];
        if (c >= 'A' && c <= 'Z') {
            playLetter(c);
        } else if (c >= '0' && c <= '9') {
            playNumber(c - '0');
        }
        delay(50);
    }
}

// ================ 智能 TTS ================
void AudioManager::playTTS(const String& text) {
    if (!audio_initialized) return;
    
    Serial.printf("TTS: %s\n", text.c_str());
    
    String lowerText = text;
    lowerText.toLowerCase();
    
    // 左转
    if (lowerText.indexOf("turn left") >= 0) {
        int distance = 30;
        for (int i = 0; i < lowerText.length(); i++) {
            if (isdigit(lowerText[i])) {
                distance = lowerText.substring(i).toInt();
                break;
            }
        }
        playDirection("left", distance);
        return;
    }
    
    // 右转
    if (lowerText.indexOf("turn right") >= 0) {
        int distance = 30;
        for (int i = 0; i < lowerText.length(); i++) {
            if (isdigit(lowerText[i])) {
                distance = lowerText.substring(i).toInt();
                break;
            }
        }
        playDirection("right", distance);
        return;
    }
    
    // 直行
    if (lowerText.indexOf("go straight") >= 0 || lowerText.indexOf("straight") >= 0) {
        int distance = 50;
        for (int i = 0; i < lowerText.length(); i++) {
            if (isdigit(lowerText[i])) {
                distance = lowerText.substring(i).toInt();
                break;
            }
        }
        playDirection("straight", distance);
        return;
    }
    
    // 到达
    if (lowerText.indexOf("arrive") >= 0 || lowerText.indexOf("destination") >= 0) {
        playWord("arrived_destination");
        return;
    }
    
    // 登机口
    if (lowerText.indexOf("gate") >= 0) {
        String gateNumber = "";
        for (int i = 0; i < text.length(); i++) {
            char c = text[i];
            if (c >= '0' && c <= '9') {
                gateNumber += c;
            }
        }
        playWord("gate");
        if (gateNumber.length() > 0) {
            delay(60);
            playNumber(gateNumber.toInt());
        }
        return;
    }
    
    // 欢迎
    if (lowerText.indexOf("welcome") >= 0) {
        playWord("welcome");
        return;
    }
    
    // SOS
    if (lowerText.indexOf("sos") >= 0) {
        playWord("sos");
        return;
    }
    
    // 默认提示音
    Serial.println("⚠️ 未匹配到语音，使用提示音");
    playSineWave(600, 100);
    delay(50);
    playSineWave(800, 100);
}

void AudioManager::playTTS(const char* text) {
    playTTS(String(text));
}

// ================ SOS 警报 ================
bool AudioManager::playSOSAlert() {
    if (!audio_initialized) return false;
    
    if (SD_MMC.exists("/sos.wav")) {
        return playWAVFile("/sos.wav");
    }
    
    Serial.println("⚠️ 使用正弦波 SOS");
    for (int i = 0; i < 3; i++) { playSineWave(1000, 200); delay(200); }
    delay(300);
    for (int i = 0; i < 3; i++) { playSineWave(1000, 600); delay(600); }
    delay(300);
    for (int i = 0; i < 3; i++) { playSineWave(1000, 200); delay(200); }
    
    return true;
}

// ================ 文件播放 ================
bool AudioManager::playFileFromSD(const char* filename) {
    if (!audio_initialized) return false;
    
    if (!SD_MMC.exists(filename)) {
        Serial.printf("文件不存在: %s\n", filename);
        return false;
    }
    
    String fn = filename;
    fn.toLowerCase();
    
    if (fn.endsWith(".wav")) {
        return playWAVFile(filename);
    } else {
        Serial.printf("不支持的文件格式: %s\n", filename);
        return false;
    }
}

// ================ 警报 ================
void AudioManager::playAlert() {
    if (!audio_initialized) return;
    playSOSAlert();
}

// ================ 单音 ================
void AudioManager::playTone(uint16_t frequency, uint16_t duration) {
    if (!audio_initialized) return;
    playSineWave(frequency, duration);
}

// ================ 音量控制 ================
void AudioManager::setVolume(uint8_t vol) {
    volume = constrain(vol, 0, 100);
    if (es8311) {
        es8311->setVolume(volume);
    }
    Serial.printf("音量: %d%%\n", volume);
}

// ================ 停止 ================
void AudioManager::stop() {
    if (!audio_initialized) return;
    i2s_zero_dma_buffer(I2S_NUM_0);
    Serial.println("音频停止");
}

// ================ 文件列表 ================
bool AudioManager::listAudioFiles() {
    Serial.println("音频文件列表:");
    File root = SD_MMC.open("/");
    File file = root.openNextFile();
    bool found = false;
    while (file) {
        String name = file.name();
        if (name.endsWith(".wav")) {
            Serial.printf("  %s (%d bytes)\n", name.c_str(), file.size());
            found = true;
        }
        file = root.openNextFile();
    }
    if (!found) Serial.println("  未找到 WAV 文件");
    return found;
}

// ================ 文件存在检查 ================
bool AudioManager::fileExists(const char* filename) {
    return SD_MMC.exists(filename);
}

// ================ 更新 ================
void AudioManager::update() {
    // 预留
}
