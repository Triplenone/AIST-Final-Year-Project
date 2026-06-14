#include "SmartNavigationPlanner.h"
#include <math.h>

namespace {
    const SmartDestination DESTINATIONS[] = {
        {"CHECKIN", "Check-in", 7.6f, 14.6f, NAV_ZONE_PUBLIC},
        {"SECURITY", "Security Check", 6.6f, 10.4f, NAV_ZONE_CHECKPOINT},
        {"CUSTOMERSERVICES", "Customer Services", 6.2f, 4.0f, NAV_ZONE_RESTRICTED},
        {"TOILET", "Toilet", 1.6f, 2.2f, NAV_ZONE_RESTRICTED},
        {"GATE10", "Gate 10", 8.0f, 1.8f, NAV_ZONE_RESTRICTED},
        {"GATE11", "Gate 11", 4.4f, 1.8f, NAV_ZONE_RESTRICTED}
    };

    const SmartRoutePoint CHECKIN_POINT = {7.6f, 14.6f, "Check-in", "go_straight"};
    const SmartRoutePoint SECURITY_POINT = {6.6f, 10.4f, "Security Check", "go_straight"};
    const SmartRoutePoint CUSTOMS_POINT = {6.2f, 7.6f, "Immigration & Customs", "go_straight"};
    const SmartRoutePoint SERVICES_POINT = {6.2f, 4.0f, "Customer Services", "go_straight"};

    float distanceTo(float x1, float y1, float x2, float y2) {
        float dx = x2 - x1;
        float dy = y2 - y1;
        return sqrtf(dx * dx + dy * dy);
    }

    void appendPoint(std::vector<SmartRoutePoint>& route, const SmartRoutePoint& point) {
        if (!route.empty()) {
            const SmartRoutePoint& last = route.back();
            if (distanceTo(last.x, last.y, point.x, point.y) < 0.15f) return;
        }
        route.push_back(point);
    }

    void appendDestination(std::vector<SmartRoutePoint>& route, const SmartDestination& destination) {
        SmartRoutePoint point = {destination.x, destination.y, destination.label, "arrive"};
        appendPoint(route, point);
        if (!route.empty()) {
            route.back().action = "arrive";
        }
    }

    bool shouldUseServicesCorridor(const String& key) {
        return key == "GATE10" || key == "GATE11" || key == "TOILET";
    }
}

namespace SmartNavigationPlanner {
    int destinationCount() {
        return sizeof(DESTINATIONS) / sizeof(DESTINATIONS[0]);
    }

    const SmartDestination& destinationAt(int index) {
        int count = destinationCount();
        if (count <= 0) return DESTINATIONS[0];
        int safeIndex = index % count;
        if (safeIndex < 0) safeIndex += count;
        return DESTINATIONS[safeIndex];
    }

    String normalizeKey(const String& input) {
        String value = input;
        value.trim();
        value.toUpperCase();
        value.replace(" ", "");
        value.replace("-", "");
        value.replace("_", "");

        if (value == "10" || value == "A10" || value == "G10" || value == "GATE10") return "GATE10";
        if (value == "11" || value == "A11" || value == "G11" || value == "GATE11") return "GATE11";
        if (value == "CHECKIN" || value == "CHECKINCOUNTER" || value == "CHECKINCOUNTERS") return "CHECKIN";
        if (value == "CUSTOMER" || value == "CUSTOMERSERVICE" || value == "CUSTOMERSERVICES" || value == "SERVICE" || value == "SERVICES") return "CUSTOMERSERVICES";
        if (value == "WC" || value == "RESTROOM" || value == "RESTROOMS" || value == "TOILET" || value == "TOILETS") return "TOILET";
        if (value == "SECURITY" || value == "SECURITYCHECK") return "SECURITY";
        if (value == "CUSTOMS" || value == "IMMIGRATION" || value == "IMMIGRATIONCUSTOMS") return "CUSTOMS";
        return value;
    }

    String normalizeLabel(const String& input) {
        const SmartDestination* destination = findDestination(input);
        if (destination) return String(destination->label);
        String key = normalizeKey(input);
        if (key == "SECURITY") return "Security Check";
        if (key == "CUSTOMS") return "Immigration & Customs";
        return input;
    }

    const SmartDestination* findDestination(const String& input) {
        String key = normalizeKey(input);
        for (int i = 0; i < destinationCount(); i++) {
            if (key == DESTINATIONS[i].key) return &DESTINATIONS[i];
        }
        return nullptr;
    }

    const char* zoneName(SmartNavigationZone zone) {
        switch (zone) {
            case NAV_ZONE_PUBLIC: return "public";
            case NAV_ZONE_CHECKPOINT: return "checkpoint";
            case NAV_ZONE_RESTRICTED: return "restricted";
            default: return "unknown";
        }
    }

    bool isRestrictedPosition(float x, float y) {
        (void)x;
        return y <= SECURITY_POINT.y;
    }

    void buildRoute(float currentX, float currentY,
                    const SmartDestination& destination,
                    std::vector<SmartRoutePoint>& route) {
        route.clear();
        SmartRoutePoint current = {currentX, currentY, "Current", "go_straight"};
        appendPoint(route, current);

        String key = String(destination.key);
        bool currentRestricted = isRestrictedPosition(currentX, currentY);
        bool destinationRestricted = destination.zone == NAV_ZONE_RESTRICTED;
        bool destinationIsCheckIn = key == "CHECKIN";

        if (destinationRestricted) {
            if (!currentRestricted) {
                appendPoint(route, CHECKIN_POINT);
                appendPoint(route, SECURITY_POINT);
                appendPoint(route, CUSTOMS_POINT);
            } else if (currentY > CUSTOMS_POINT.y + 0.4f) {
                appendPoint(route, CUSTOMS_POINT);
            }

            if (shouldUseServicesCorridor(key) && key != "CUSTOMERSERVICES") {
                appendPoint(route, SERVICES_POINT);
            }
        } else if (destinationIsCheckIn && currentRestricted) {
            appendPoint(route, CUSTOMS_POINT);
            appendPoint(route, SECURITY_POINT);
        }

        appendDestination(route, destination);
    }

    void printDestinations(Stream& stream) {
        stream.println("Smart navigation destinations:");
        for (int i = 0; i < destinationCount(); i++) {
            const SmartDestination& destination = DESTINATIONS[i];
            stream.printf("  %s | %s | %.1f,%.1f | %s\n",
                          destination.key,
                          destination.label,
                          destination.x,
                          destination.y,
                          zoneName(destination.zone));
        }
    }
}
