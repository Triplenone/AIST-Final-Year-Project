// PageManager.h
#ifndef PAGE_MANAGER_H
#define PAGE_MANAGER_H

#include <Arduino.h>

enum ScreenPage {
    PAGE_HOME = 0,      // 首页：时间日期
    PAGE_NAV = 1,       // 第二页：导航画面
    PAGE_HEALTH = 2     // 第三页：健康数据
};

class PageManager {
private:
    ScreenPage currentPage;
    
public:
    PageManager() : currentPage(PAGE_HOME) {}
    
    ScreenPage getCurrentPage() { return currentPage; }
    
    void nextPage() {
        if (currentPage < PAGE_HEALTH) {
            currentPage = (ScreenPage)(currentPage + 1);
            Serial.printf("[页面] 切换到: %d\n", currentPage);
        } else {
            currentPage = (ScreenPage)(PAGE_HOME);
            Serial.printf("[页面] 切换到: %d\n", currentPage);            
        }
    }
    
    void prevPage() {
        if (currentPage > PAGE_HOME) {
            currentPage = (ScreenPage)(currentPage - 1);
            Serial.printf("[页面] 切换到: %d\n", currentPage);
        } else {
            currentPage = (ScreenPage)(PAGE_HEALTH);
            Serial.printf("[页面] 切换到: %d\n", currentPage);            
        }
    }
    
    void setPage(ScreenPage page) {
        if (page >= PAGE_HOME && page <= PAGE_HEALTH) {
            currentPage = page;
        }
    }
};

#endif