-- Convert the FlyCare demo branch into an elderly-care indoor demo profile.
-- Safe to re-run: every statement targets stable primary keys and does not
-- delete or renumber users, devices, events, or the demo registry.

UPDATE location_zone
SET name = CASE location_zone_id
    WHEN 1 THEN 'Door1'
    WHEN 2 THEN 'Door2'
    WHEN 3 THEN 'Nurse Station'
    WHEN 4 THEN 'Activity Room'
    WHEN 5 THEN 'Rehabilitation Room'
    WHEN 6 THEN 'Central Common Area'
    WHEN 7 THEN 'Toilet'
    WHEN 8 THEN 'Bedroom'
    ELSE name
END,
category = CASE location_zone_id
    WHEN 1 THEN 'outdoor_area'
    WHEN 2 THEN 'outdoor_area'
    WHEN 3 THEN 'common_area'
    WHEN 4 THEN 'common_area'
    WHEN 5 THEN 'common_area'
    WHEN 6 THEN 'common_area'
    WHEN 7 THEN 'bathroom'
    WHEN 8 THEN 'room'
    ELSE category
END
WHERE location_zone_id BETWEEN 1 AND 8;

UPDATE device
SET deploy_location = CASE device_id
    WHEN 3 THEN 'Nurse Station'
    WHEN 4 THEN 'Activity Room'
    WHEN 6 THEN 'Rehabilitation Room'
    WHEN 7 THEN 'Toilet'
    WHEN 8 THEN 'Central Common Area'
    WHEN 9 THEN 'Bedroom'
    ELSE deploy_location
END
WHERE device_id IN (3, 4, 6, 7, 8, 9);

UPDATE user
SET medical_conditions = CASE user_id
    WHEN 4 THEN 'Hypertension monitoring'
    WHEN 8 THEN 'Post-surgery mobility support'
    WHEN 13 THEN 'Daily activity monitoring'
    WHEN 14 THEN 'Fall risk monitoring'
    WHEN 15 THEN 'Heart-rate watchlist'
    WHEN 16 THEN 'SpO2 observation'
    ELSE medical_conditions
END
WHERE user_id IN (4, 8, 13, 14, 15, 16);
