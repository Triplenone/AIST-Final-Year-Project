// fix_compile_errors.h
#ifndef FIX_COMPILE_ERRORS_H
#define FIX_COMPILE_ERRORS_H

// LEDC 兼容性宏
#ifdef ledcAttach
    #define USE_NEW_LEDC
#else
    #define USE_OLD_LEDC
#endif

// BLE 兼容性宏
#define BLE_SCAN_RESULTS_IS_OBJECT

#endif