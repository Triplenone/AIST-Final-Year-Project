// PageManager.h
#ifndef PAGE_MANAGER_H
#define PAGE_MANAGER_H

#include <Arduino.h>

enum ScreenPage {
    PAGE_HOME = 0,      // 首页：时间日期
    PAGE_NAV = 1,       // 第二页：导航画面
    PAGE_FLIGHT = 2     // 第三页：航班信息
};

class PageManager {
private:
    ScreenPage currentPage;
    
public:
    PageManager() : currentPage(PAGE_NAV) {}
    
    ScreenPage getCurrentPage() { return currentPage; }
    
    void nextPage() {
        if (currentPage < PAGE_FLIGHT) {
            currentPage = (ScreenPage)(currentPage + 1);
            Serial.printf("[页面] 切换到: %d\n", currentPage);
        } else {
            currentPage = PAGE_HOME;
            Serial.printf("[页面] 切换到: %d\n", currentPage);            
        }
    }
    
    void prevPage() {
        if (currentPage > PAGE_HOME) {
            currentPage = (ScreenPage)(currentPage - 1);
            Serial.printf("[页面] 切换到: %d\n", currentPage);
        } else {
            currentPage = PAGE_FLIGHT;
            Serial.printf("[页面] 切换到: %d\n", currentPage);            
        }
    }
    
    void setPage(ScreenPage page) {
        if (page >= PAGE_HOME && page <= PAGE_FLIGHT) {
            currentPage = page;
        }
    }
};

#endif
