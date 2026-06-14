#include "es8311.h"
#include "esp32-hal-log.h"

static const ES8311CoeffDiv coeff_div[] = {
    /*!<mclk     rate   pre_div  mult  adc_div dac_div fs_mode lrch  lrcl  bckdiv osr */
    /* 8k */
    {12288000, 8000, 0x06, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {18432000, 8000, 0x03, 0x01, 0x03, 0x03, 0x00, 0x05, 0xff, 0x18, 0x10, 0x10},
    {16384000, 8000, 0x08, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {8192000, 8000, 0x04, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {6144000, 8000, 0x03, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {4096000, 8000, 0x02, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {3072000, 8000, 0x01, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {2048000, 8000, 0x01, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {1536000, 8000, 0x03, 0x02, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {1024000, 8000, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},

    /* 11.025k */
    {11289600, 11025, 0x04, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {5644800, 11025, 0x02, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {2822400, 11025, 0x01, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {1411200, 11025, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},

    /* 12k */
    {12288000, 12000, 0x04, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {6144000, 12000, 0x02, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {3072000, 12000, 0x01, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {1536000, 12000, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},

    /* 16k */
    {12288000, 16000, 0x03, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {18432000, 16000, 0x03, 0x01, 0x03, 0x03, 0x00, 0x02, 0xff, 0x0c, 0x10, 0x10},
    {16384000, 16000, 0x04, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {8192000, 16000, 0x02, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {6144000, 16000, 0x03, 0x01, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {4096000, 16000, 0x01, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {3072000, 16000, 0x03, 0x02, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {2048000, 16000, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {1536000, 16000, 0x03, 0x03, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {1024000, 16000, 0x01, 0x02, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},

    /* 22.05k */
    {11289600, 22050, 0x02, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {5644800, 22050, 0x01, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {2822400, 22050, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {1411200, 22050, 0x01, 0x02, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {705600, 22050, 0x01, 0x03, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},

    /* 24k */
    {12288000, 24000, 0x02, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {18432000, 24000, 0x03, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {6144000, 24000, 0x01, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {3072000, 24000, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {1536000, 24000, 0x01, 0x02, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},

    /* 32k */
    {12288000, 32000, 0x03, 0x01, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {18432000, 32000, 0x03, 0x02, 0x03, 0x03, 0x00, 0x02, 0xff, 0x0c, 0x10, 0x10},
    {16384000, 32000, 0x02, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {8192000, 32000, 0x01, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {6144000, 32000, 0x03, 0x02, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {4096000, 32000, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {3072000, 32000, 0x03, 0x03, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {2048000, 32000, 0x01, 0x02, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {1536000, 32000, 0x03, 0x03, 0x01, 0x01, 0x01, 0x00, 0x7f, 0x02, 0x10, 0x10},
    {1024000, 32000, 0x01, 0x03, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},

    /* 44.1k */
    {11289600, 44100, 0x01, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {5644800, 44100, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {2822400, 44100, 0x01, 0x02, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {1411200, 44100, 0x01, 0x03, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},

    /* 48k */
    {12288000, 48000, 0x01, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {18432000, 48000, 0x03, 0x01, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {6144000, 48000, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {3072000, 48000, 0x01, 0x02, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {1536000, 48000, 0x01, 0x03, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},

    /* 64k */
    {12288000, 64000, 0x03, 0x02, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {18432000, 64000, 0x03, 0x02, 0x03, 0x03, 0x01, 0x01, 0x7f, 0x06, 0x10, 0x10},
    {16384000, 64000, 0x01, 0x00, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {8192000, 64000, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {6144000, 64000, 0x01, 0x02, 0x03, 0x03, 0x01, 0x01, 0x7f, 0x06, 0x10, 0x10},
    {4096000, 64000, 0x01, 0x02, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {3072000, 64000, 0x01, 0x03, 0x03, 0x03, 0x01, 0x01, 0x7f, 0x06, 0x10, 0x10},
    {2048000, 64000, 0x01, 0x03, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {1536000, 64000, 0x01, 0x03, 0x01, 0x01, 0x01, 0x00, 0xbf, 0x03, 0x18, 0x18},
    {1024000, 64000, 0x01, 0x03, 0x01, 0x01, 0x01, 0x00, 0x7f, 0x02, 0x10, 0x10},

    /* 88.2k */
    {11289600, 88200, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {5644800, 88200, 0x01, 0x02, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {2822400, 88200, 0x01, 0x03, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {1411200, 88200, 0x01, 0x03, 0x01, 0x01, 0x01, 0x00, 0x7f, 0x02, 0x10, 0x10},

    /* 96k */
    {12288000, 96000, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {18432000, 96000, 0x03, 0x02, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {6144000, 96000, 0x01, 0x02, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {3072000, 96000, 0x01, 0x03, 0x01, 0x01, 0x00, 0x00, 0xff, 0x04, 0x10, 0x10},
    {1536000, 96000, 0x01, 0x03, 0x01, 0x01, 0x01, 0x00, 0x7f, 0x02, 0x10, 0x10},
};

ES8311::ES8311(TwoWire *wire) 
    : _wire(wire), _mclk_hz(0), _address(ES8311_ADDR) {
}

ES8311::~ES8311() {
    if (_wire != nullptr && _is_initialized) {
        _wire->end();
    }
}

bool ES8311::begin(int32_t sda, int32_t scl, uint32_t frequency){
    if (sda < 0 || scl < 0) {
        log_e("Invalid SDA/SCL pins: sda=%d, scl=%d", sda, scl);
        return false;
    }
    
    // Initialize I2C
    _wire->begin(sda, scl, frequency);
    
    // Check if device is connected
    if (!isConnected()) {
        log_e("ES8311 not found at address 0x%02X", _address);       
        return false;
    }

    bool ok = true;
    
    // 1. Reset sequence    
    ok &= writeRegister(0x00, 0x1F);  // Reset
    delay(20);
    ok &= writeRegister(0x00, 0x00);  // Release reset
    ok &= writeRegister(0x00, 0x80);  // Power on
    delay(10);
    
    // 2. Basic clock configuration
    ok &= writeRegister(0x01, 0xBF);  // Enable all clocks
    
    // 3. Set sample rate FIRST (这会配置时钟相关寄存器)
    ok &= setSampleRate(ES8311_DEFAULT_SAMPLE_RATE);
    
    // 4. Set bits per sample
    ok &= setBitsPerSample(ES8311_DEFAULT_BITS_PER_SAMPLE);
    
    // 5. Power management - step by step
    ok &= writeRegister(0x0B, 0x00);  // VMID bias
    ok &= writeRegister(0x0C, 0x10);  // VREF reference
    ok &= writeRegister(0x0D, 0x01);  // Start analog circuit
    delay(10);
    ok &= writeRegister(0x0D, 0x03);  // Start ADC/DAC
    delay(10);
    ok &= writeRegister(0x0D, 0x07);  // Start all power
    delay(10);
    
    // 6. DAC configuration (default for playback)
    ok &= writeRegister(0x12, 0x04);  // DAC on
    ok &= writeRegister(0x13, 0x30);  // Output: Line Out
    ok &= writeRegister(0x37, 0x08);  // Bypass DAC equalizer
    ok &= writeRegister(0x31, 0x00);  // Unmute
    ok &= writeRegister(0x32, 0xD8);  // Default volume ~85%
    ok &= writeRegister(0x0E, 0x02);  // Enable analog PGA, ADC modulator
    ok &= writeRegister(0x1C, 0x6A);  // ADC Equalizer bypass
    
    // 7. ADC configuration (初始时禁用)
    ok &= writeRegister(0x14, 0x00);  // Disable inputs
    ok &= writeRegister(0x15, 0x00);  // ADC off
    ok &= writeRegister(0x16, 0x04);  // MIC gain (默认)
    ok &= writeRegister(0x17, 0xC8);  // ADC volume
    
    if (ok) {
        _is_initialized = true;
        log_i("ES8311 initialized successfully");
        
        // 验证配置
        log_i("Verifying configuration...");
        uint8_t reg09 = readRegister(0x09);
        uint8_t reg0A = readRegister(0x0A);
        uint8_t reg12 = readRegister(0x12);
        uint8_t reg13 = readRegister(0x13);
        
        log_i("Reg 0x09 (SDIN): 0x%02X (expected: 0x30)", reg09);
        log_i("Reg 0x0A (SDOUT): 0x%02X (expected: 0x30)", reg0A);
        log_i("Reg 0x12 (DAC): 0x%02X (expected: 0x04)", reg12);
        log_i("Reg 0x13 (Output): 0x%02X (expected: 0x30)", reg13);
        
        if (reg09 != 0x30 || reg0A != 0x30) {
            log_e("Format registers incorrect!");
            return false;
        }
        
        if (reg12 != 0x04 || reg13 != 0x30) {
            log_e("Output registers incorrect!");
            return false;
        }
    } else {
        log_e("ES8311 initialization failed");
    }
    
    return ok;
}

bool ES8311::begin() {
    // Use default I2C pins (ESP32: 21, 22)
#ifdef ESP32
    return begin(21, 22);
#else
    log_e("begin() without pins not supported on this platform");
    return false;
#endif
}

bool ES8311::setVolume(uint8_t volume) {
    if (volume > 100) {
        volume = 100;
    }
    
    uint8_t reg32;
    if (volume == 0) {
        reg32 = 0;  // Mute
    } else {
        // Convert 0-100 to 0-255 range (ES8311 volume is 0-255)
        reg32 = map(volume, 0, 100, 1, 255);
    }
    
    bool result = writeRegister(0x32, reg32);
    if (result) {
        log_d("Volume set to %d%% (register: 0x%02X)", volume, reg32);
    }
    return result;
}

uint8_t ES8311::getVolume() {
    uint8_t reg32 = readRegister(0x32);
    
    if (reg32 == 0) {
        return 0;
    } else {
        // Convert 1-255 to 1-100
        return map(reg32, 1, 255, 1, 100);
    }
}

bool ES8311::setSampleRate(uint32_t sample_rate) {
    if (sample_rate < 8000 || sample_rate > 96000) {
        log_e("Invalid sample rate: %lu", sample_rate);
        return false;
    }
    
    bool ok = true;
    
    // 使用你的工作配置的确切值
    if (sample_rate == 44100) {
        // 你的工作配置的确切值
        ok &= writeRegister(0x02, 0x18);  // pre_div=1, pre_multi=0 (关键！)
        ok &= writeRegister(0x03, 0x10);  // ADC OSR=16
        ok &= writeRegister(0x04, 0x10);  // DAC OSR=16
        ok &= writeRegister(0x05, 0x00);  // ADC_div=1, DAC_div=1
        ok &= writeRegister(0x06, 0x04);  // BCLK分频
        ok &= writeRegister(0x07, 0x00);  // LRCK高字节
        ok &= writeRegister(0x08, 31);    // LRCK低字节 = 32分频
        
        _mclk_hz = 11289600;  // 44.1kHz * 256
        
        log_d("ES8311 sample rate set to 44.1kHz (reg02=0x18)");
        
    } else if (sample_rate == 16000) {
        // 16kHz录音配置
        ok &= writeRegister(0x02, 0x03);  // 16kHz配置
        ok &= writeRegister(0x03, 0x10);
        ok &= writeRegister(0x04, 0x10);
        ok &= writeRegister(0x05, 0x00);
        ok &= writeRegister(0x06, 0x04);
        ok &= writeRegister(0x07, 0x00);
        ok &= writeRegister(0x08, 0xFF);
        
        _mclk_hz = 4096000;  // 16kHz * 256
        
        log_d("ES8311 sample rate set to 16kHz");
        
    } else if (sample_rate == 48000) {
        // 48kHz配置
        ok &= writeRegister(0x02, 0x00);  // 48kHz配置
        ok &= writeRegister(0x03, 0x10);
        ok &= writeRegister(0x04, 0x10);
        ok &= writeRegister(0x05, 0x00);
        ok &= writeRegister(0x06, 0x04);
        ok &= writeRegister(0x07, 0x00);
        ok &= writeRegister(0x08, 35);    // 48kHz LRCK
        
        _mclk_hz = 12288000;  // 48kHz * 256
        
        log_d("ES8311 sample rate set to 48kHz");
        
    } else {
        // 其他采样率使用查找表
        _mclk_hz = sample_rate * 256;
        
        if (sample_rate > 48000) {
            _mclk_hz = sample_rate * 128;
        }
        
        int coeff_idx = getCoeffIndex(_mclk_hz, sample_rate);
        if (coeff_idx < 0) {
            log_e("No coefficient found for sample rate %lu", sample_rate);
            return false;
        }
        
        const ES8311CoeffDiv *coeff = &coeff_div[coeff_idx];
        
        uint8_t reg02 = (coeff->pre_div - 1) << 5;
        reg02 |= coeff->pre_multi << 3;
        ok &= writeRegister(0x02, reg02);
        
        uint8_t reg03 = (coeff->fs_mode << 6) | coeff->adc_osr;
        ok &= writeRegister(0x03, reg03);
        
        ok &= writeRegister(0x04, coeff->dac_osr);
        
        uint8_t reg05 = ((coeff->adc_div - 1) << 4) | (coeff->dac_div - 1);
        ok &= writeRegister(0x05, reg05);
        
        uint8_t reg06 = readRegister(0x06);
        reg06 &= 0xE0;
        reg06 |= (coeff->bclk_div < 19) ? (coeff->bclk_div - 1) : coeff->bclk_div;
        ok &= writeRegister(0x06, reg06);
        
        uint8_t reg07 = readRegister(0x07);
        reg07 &= 0xC0;
        reg07 |= coeff->lrck_h;
        ok &= writeRegister(0x07, reg07);
        
        ok &= writeRegister(0x08, coeff->lrck_l);
        
        log_d("ES8311 sample rate set to %lu Hz using coeff table", sample_rate);
    }
    
    return ok;
}

bool ES8311::setBitsPerSample(uint8_t bps) {
    uint8_t reg09 = 0x00;
    uint8_t reg0A = 0x00;

    switch (bps) {
        case 16:
            reg09 = 0x30;  // 0b00110000 = 16-bit I2S
            reg0A = 0x30;
            break;
        case 18:
            reg09 = 0x28;  // 0b00101000 = 18-bit I2S
            reg0A = 0x28;
            break;
        case 20:
            reg09 = 0x24;  // 0b00100100 = 20-bit I2S
            reg0A = 0x24;
            break;
        case 24:
            reg09 = 0x20;  // 0b00100000 = 24-bit I2S
            reg0A = 0x20;
            break;
        case 32:
            reg09 = 0x34;  // 0b00110100 = 32-bit I2S
            reg0A = 0x34;
            break;
        default:
            log_e("Invalid bits per sample: %d", bps);
            return false;
    }
    
    bool ok = writeRegister(0x09, reg09);
    ok &= writeRegister(0x0A, reg0A);
    
    if (ok) {
        log_d("Bits per sample set to %d (reg09=0x%02X, reg0A=0x%02X)", bps, reg09, reg0A);
    }
    
    return ok;
}

bool ES8311::enableMicrophone() {
    uint8_t reg14 = readRegister(0x14);
    // Enable microphone with default PGA gain
    reg14 = 0x1A;  // Enable analog MIC, PGA gain
    log_d("Microphone enabled");    
    // Enable ADC
    writeRegister(0x15, 0x40);    
    bool ok = writeRegister(0x14, reg14);    
    return ok;
}

bool ES8311::disableMicrophone() {
    uint8_t reg14 = readRegister(0x14);    
    // Disable microphone inputs
    reg14 = 0x00;  // Disable all inputs
    log_d("Microphone disabled");    
    // Disable ADC
    writeRegister(0x15, 0x00);    
    bool ok = writeRegister(0x14, reg14);    
    return ok;
}

bool ES8311::setMicrophoneGain(uint8_t gain) {
    if (gain > 7) {
        gain = 7;
    }
    
    uint8_t reg16 = readRegister(0x16);
    reg16 &= 0xF8;  // Clear lower 3 bits
    reg16 |= gain;  // Set gain
    
    bool ok = writeRegister(0x16, reg16);
    
    if (ok) {
        log_d("Microphone gain set to %d", gain);
    }
    
    return ok;
}

uint8_t ES8311::getMicrophoneGain() {
    uint8_t reg16 = readRegister(0x16);
    return (reg16 & 0x07);
}

// Switch between playback and recording modes
bool ES8311::setMode(bool is_playback) {
    bool ok = true;
    
    if (is_playback) {
        // 播放模式：44.1kHz
        log_d("Setting ES8311 to playback mode (44.1kHz)");
        
        // 禁用ADC
        ok &= writeRegister(0x14, 0x00);  // 禁用输入
        ok &= writeRegister(0x15, 0x00);  // ADC off
        ok &= writeRegister(0x16, 0x00);  // MIC增益最小
        ok &= writeRegister(0x17, 0x00);  // ADC音量最小
        
        // 启用DAC
        ok &= writeRegister(0x12, 0x04);  // DAC on
        ok &= writeRegister(0x13, 0x30);  // Line Out
        ok &= writeRegister(0x31, 0x00);  // Unmute
        
        // 设置播放采样率（44.1kHz）
        ok &= setSampleRate(44100);
        
    } else {
        // 录音模式：16kHz
        log_d("Setting ES8311 to recording mode (16kHz)");
        
        // 禁用DAC
        ok &= writeRegister(0x12, 0x00);  // DAC off
        ok &= writeRegister(0x13, 0x00);  // 禁用输出
        ok &= writeRegister(0x31, 0x80);  // Mute
        
        // 启用ADC
        ok &= writeRegister(0x14, 0x1A);  // 启用模拟MIC
        ok &= writeRegister(0x15, 0x40);  // ADC on
        ok &= writeRegister(0x16, 0x03);  // MIC增益=3（中等）
        ok &= writeRegister(0x17, 0xC8);  // ADC音量
        
        // 设置录音采样率（16kHz）
        ok &= setSampleRate(16000);
    }
    
    return ok;
}

bool ES8311::isConnected() {
    _wire->beginTransmission(_address);
    return _wire->endTransmission() == 0;
}

void ES8311::setAddress(uint8_t address) {
    _address = address;
}

bool ES8311::writeRegister(uint8_t reg, uint8_t val) {
    _wire->beginTransmission(_address);
    _wire->write(reg);
    _wire->write(val);
    return _wire->endTransmission() == 0;
}

uint8_t ES8311::readRegister(uint8_t reg) {
    _wire->beginTransmission(_address);
    _wire->write(reg);
    _wire->endTransmission(false);
    
    uint8_t value = 0;
    uint8_t bytes = _wire->requestFrom(_address, (uint8_t)1);
    
    if (bytes == 1) {
        value = _wire->read();
    }
    
    _wire->endTransmission();
    return value;
}

void ES8311::dumpAllRegisters() {
    Serial.println("ES8311 Register Dump:");
    Serial.println("=====================");
    
    for (uint8_t reg = 0; reg <= 0x4A; reg++) {
        uint8_t value = readRegister(reg);
        Serial.printf("0x%02X: 0x%02X", reg, value);
        
        // Add descriptions for important registers
        switch (reg) {
            case 0x00: Serial.print(" (Control 1)"); break;
            case 0x01: Serial.print(" (Control 2)"); break;
            case 0x06: Serial.print(" (BCLK Control)"); break;
            case 0x14: Serial.print(" (ADC Control)"); break;
            case 0x16: Serial.print(" (MIC Gain)"); break;
            case 0x32: Serial.print(" (Volume)"); break;
        }
        
        Serial.println();
    }
    Serial.println("=====================");
}

// Private methods
int ES8311::getCoeffIndex(uint32_t mclk, uint32_t rate) {
    for (size_t i = 0; i < sizeof(coeff_div) / sizeof(coeff_div[0]); i++) {
        if (coeff_div[i].rate == rate && coeff_div[i].mclk == mclk) {
            return i;
        }
    }
    return -1;
}





