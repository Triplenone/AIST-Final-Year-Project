// MutexTracker.cpp
#include "MutexTracker.h"

#if ENABLE_MUTEX_TRACKING

// 记录锁的持有者
struct MutexRecord {
    SemaphoreHandle_t mutex;
    const char* holder;
    int line;
    unsigned long time;
};

static MutexRecord mutexRecords[10];  // 最多跟踪10个锁
static int recordCount = 0;

bool takeMutexWithTracking(SemaphoreHandle_t mutex, TickType_t timeout, const char* taskName, int line) {
    unsigned long startTime = millis();
    
    // 尝试获取锁
    bool success = (xSemaphoreTake(mutex, timeout) == pdTRUE);
    unsigned long elapsed = millis() - startTime;
    
    // 打印获取锁的尝试
    Serial.printf("[MUTEX] %s 尝试获取锁 (line %d), 等待%dms, %s\n", 
                  taskName, line, timeout == portMAX_DELAY ? -1 : (int)(timeout * portTICK_PERIOD_MS),
                  success ? "成功✅" : "失败❌");
    
    if (elapsed > 100) {
        Serial.printf("[MUTEX] ⚠️ %s 等待锁耗时 %dms\n", taskName, elapsed);
    }
    
    if (success) {
        // 记录锁的持有者
        for (int i = 0; i < recordCount; i++) {
            if (mutexRecords[i].mutex == mutex) {
                // 更新已有记录
                mutexRecords[i].holder = taskName;
                mutexRecords[i].line = line;
                mutexRecords[i].time = millis();
                break;
            }
        }
        if (recordCount < 10) {
            mutexRecords[recordCount].mutex = mutex;
            mutexRecords[recordCount].holder = taskName;
            mutexRecords[recordCount].line = line;
            mutexRecords[recordCount].time = millis();
            recordCount++;
        }
    }
    
    return success;
}

void giveMutexWithTracking(SemaphoreHandle_t mutex, const char* taskName, int line) {
    // 查找持有者
    for (int i = 0; i < recordCount; i++) {
        if (mutexRecords[i].mutex == mutex) {
            unsigned long holdTime = millis() - mutexRecords[i].time;
            if (holdTime > 100) {
                Serial.printf("[MUTEX] ⚠️ %s 持有锁 %dms (line %d)\n", 
                              mutexRecords[i].holder, holdTime, mutexRecords[i].line);
            }
            break;
        }
    }
    
    Serial.printf("[MUTEX] %s 释放锁 (line %d)\n", taskName, line);
    xSemaphoreGive(mutex);
}

void printMutexStatus() {
    Serial.println("\n=== 互斥锁状态 ===");
    for (int i = 0; i < recordCount; i++) {
        unsigned long holdTime = millis() - mutexRecords[i].time;
        Serial.printf("  锁%p: 持有者=%s, 持有时间=%dms\n", 
                      mutexRecords[i].mutex, 
                      mutexRecords[i].holder ? mutexRecords[i].holder : "无",
                      holdTime);
    }
    Serial.println("==================\n");
}

#endif