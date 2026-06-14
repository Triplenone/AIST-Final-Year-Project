// MutexTracker.h
#ifndef MUTEX_TRACKER_H
#define MUTEX_TRACKER_H

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>

// 启用互斥锁跟踪（调试完成后可以注释掉）
#define ENABLE_MUTEX_TRACKING 1

#if ENABLE_MUTEX_TRACKING

// 跟踪锁的获取
#define TAKE_MUTEX(mutex, timeout, taskName) \
    takeMutexWithTracking(mutex, timeout, taskName, __LINE__)

// 跟踪锁的释放
#define GIVE_MUTEX(mutex, taskName) \
    giveMutexWithTracking(mutex, taskName, __LINE__)

// 函数声明
bool takeMutexWithTracking(SemaphoreHandle_t mutex, TickType_t timeout, const char* taskName, int line);
void giveMutexWithTracking(SemaphoreHandle_t mutex, const char* taskName, int line);
void printMutexStatus();

#else

#define TAKE_MUTEX(mutex, timeout, taskName) xSemaphoreTake(mutex, timeout)
#define GIVE_MUTEX(mutex, taskName) xSemaphoreGive(mutex)
#define printMutexStatus()

#endif

#endif