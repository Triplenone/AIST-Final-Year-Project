#ifndef SMART_NAVIGATION_PLANNER_H
#define SMART_NAVIGATION_PLANNER_H

#include <Arduino.h>
#include <vector>

enum SmartNavigationZone {
    NAV_ZONE_PUBLIC,
    NAV_ZONE_CHECKPOINT,
    NAV_ZONE_RESTRICTED
};

struct SmartDestination {
    const char* key;
    const char* label;
    float x;
    float y;
    SmartNavigationZone zone;
};

struct SmartRoutePoint {
    float x;
    float y;
    const char* name;
    const char* action;
};

namespace SmartNavigationPlanner {
    int destinationCount();
    const SmartDestination& destinationAt(int index);
    const SmartDestination* findDestination(const String& input);
    String normalizeKey(const String& input);
    String normalizeLabel(const String& input);
    const char* zoneName(SmartNavigationZone zone);
    bool isRestrictedPosition(float x, float y);
    void buildRoute(float currentX, float currentY,
                    const SmartDestination& destination,
                    std::vector<SmartRoutePoint>& route);
    void printDestinations(Stream& stream);
}

#endif
