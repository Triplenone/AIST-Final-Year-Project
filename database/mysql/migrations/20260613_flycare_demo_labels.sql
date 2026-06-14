-- Normalize legacy care-home demo labels to FlyCare airport labels.
-- Safe to re-run: every statement is a targeted UPDATE by stable primary key or value.

UPDATE location_zone
SET name = CASE location_zone_id
    WHEN 1 THEN 'Check-in'
    WHEN 2 THEN 'Public Concourse'
    WHEN 3 THEN 'Security Checkpoint'
    WHEN 4 THEN 'Customer Services'
    WHEN 5 THEN 'Immigration & Customs'
    WHEN 6 THEN 'Main Concourse'
    WHEN 7 THEN 'Toilet'
    WHEN 8 THEN 'Gate 11'
    WHEN 9 THEN 'Gate 10'
    WHEN 10 THEN 'Baggage Services'
    ELSE name
END,
category = CASE location_zone_id
    WHEN 1 THEN 'outdoor_area'
    WHEN 2 THEN 'corridor'
    WHEN 3 THEN 'common_area'
    WHEN 4 THEN 'common_area'
    WHEN 5 THEN 'common_area'
    WHEN 6 THEN 'common_area'
    WHEN 7 THEN 'bathroom'
    WHEN 8 THEN 'room'
    WHEN 9 THEN 'room'
    WHEN 10 THEN 'outdoor_area'
    ELSE category
END
WHERE location_zone_id BETWEEN 1 AND 10;

UPDATE device
SET deploy_location = CASE device_id
    WHEN 1 THEN 'Check-in'
    WHEN 2 THEN 'Public Concourse'
    WHEN 3 THEN 'Security Checkpoint'
    WHEN 4 THEN 'Gate 10'
    WHEN 5 THEN 'Customer Services'
    WHEN 6 THEN 'Immigration & Customs'
    WHEN 7 THEN 'Toilet'
    WHEN 8 THEN 'Gate 10'
    WHEN 9 THEN 'Gate 11'
    WHEN 10 THEN 'Baggage Services'
    ELSE deploy_location
END
WHERE device_id BETWEEN 1 AND 10;

UPDATE user
SET medical_conditions = CASE user_id
    WHEN 1 THEN 'Wheelchair assistance requested'
    WHEN 4 THEN 'Priority boarding assistance'
    WHEN 6 THEN 'Mobility assistance requested'
    WHEN 8 THEN 'General airport assistance'
    WHEN 10 THEN 'Priority escort requested'
    ELSE COALESCE(medical_conditions, '')
END
WHERE user_id IN (1, 4, 6, 8, 10);
