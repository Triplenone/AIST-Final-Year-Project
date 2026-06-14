#pragma once

#include <Arduino.h>
#include <Wire.h>

#define ES8311_ADDR              				0x18        ///< Default I2C address
#define ES8311_DEFAULT_SAMPLE_RATE   		44100   		///< Default sample rate
#define ES8311_DEFAULT_BITS_PER_SAMPLE 	16    			///< Default bits per sample

/**
 * @brief Clock coefficient structure for ES8311 configuration
 */
struct ES8311CoeffDiv {
    uint32_t mclk;        ///< MCLK frequency
    uint32_t rate;        ///< Sample rate
    uint8_t pre_div;      ///< Pre-divider (1-8)
    uint8_t pre_multi;    ///< Pre-multiplier (0:1x, 1:2x, 2:4x, 3:8x)
    uint8_t adc_div;      ///< ADC clock divider
    uint8_t dac_div;      ///< DAC clock divider
    uint8_t fs_mode;      ///< Double/single speed (0: single, 1: double)
    uint8_t lrck_h;       ///< LRCK high divider
    uint8_t lrck_l;       ///< LRCK low divider
    uint8_t bclk_div;     ///< BCLK divider
    uint8_t adc_osr;      ///< ADC oversampling rate
    uint8_t dac_osr;      ///< DAC oversampling rate
};

/**
 * @brief ES8311 Audio Codec Class
 * 
 * Provides control interface for ES8311 audio codec via I2C.
 * Supports playback, recording, and configuration.
 */
class ES8311 {
public:
    ES8311(TwoWire *wire = &Wire);
    ~ES8311();
    

    bool begin(int32_t sda, int32_t scl, uint32_t frequency = 400000);    
    bool begin();
    

    bool setVolume(uint8_t volume);
    uint8_t getVolume();
    
    bool setSampleRate(uint32_t sample_rate);
    bool setBitsPerSample(uint8_t bps);
    

    bool enableMicrophone();
		bool disableMicrophone();
    bool setMicrophoneGain(uint8_t gain);
    uint8_t getMicrophoneGain();

		bool setMode(bool is_playback);  // true=playback, false=recording
		
		bool isConnected();
		void setAddress(uint8_t address);

		bool writeRegister(uint8_t reg, uint8_t val);
    uint8_t readRegister(uint8_t reg);
		void dumpAllRegisters();
		
private:
    TwoWire *_wire;
    uint32_t _mclk_hz;
    uint8_t _address;
		bool _is_initialized = false;
    
    int getCoeffIndex(uint32_t mclk, uint32_t rate);

    // Disable copy constructor and assignment operator
    ES8311(const ES8311&) = delete;
    ES8311& operator=(const ES8311&) = delete;
};