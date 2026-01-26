use fishedex;

-- sample users.
INSERT INTO users (username, email, password_hash) VALUES
('u!ys', 'u!ys@example.com', 'hashed_ulys'),
('goonma', 'boonma@example.com', 'hashed_boon'),
('yetushi', 'nick@example.com', 'hashed_nick'),
('chaimai', 'aidan@example.com', 'hashed_angel'),
('macbones', 'mac@example.com', 'hashed_mac'),
('wah~xing', 'xing@example.com', 'hashed_xing');

-- locations.
-- Note: Sample GPS coordinates for Oregon locations (can be updated with actual coordinates)
INSERT INTO locations (location_name, region, pinpoint, latitude, longitude, is_secret, lore) VALUES
('Q St. Sewer', 'Springfield, OR', NULL, 44.0462, -123.0220, TRUE, 'Pre`s running grounds. Heron grounds.'),
('Bunch Bar', 'Elkton, OR', NULL, 43.6365, -123.5673, TRUE, 'Chrome come in heavy start of Nov.'),
('Big Fall Crik', 'Lowell, OR', NULL, 43.9187, -122.7834, TRUE, 'Prime time when water drops below 2ft.'),
('Coug Res', 'Blueriver Rainbow, OR', NULL, 44.3000, -122.2000, TRUE, 'Big bulls and zombie kings. Res inflow.'),
('Wicked Yutes', '(Near Crescent), OR', NULL, 43.4567, -121.6789, TRUE, 'Huge browns and kok`s gorge on Deschutes inflow. Third peninsula camp ground.'),
('Slaw', 'Mapleton, Deadwood, Cushman, OR', NULL, 44.0312, -123.8567, TRUE, 'Freshest runs of kings n ho`s.'),
('Horton P', 'Blachly, OR', NULL, 44.2000, -123.5000, TRUE, 'Bass n sum lil trout.'),
('Long Tom', 'Veneta, OR', NULL, 44.0487, -123.3506, TRUE, 'Beauty wild cuts, sandy bottom and full of log jams.');

-- outings.
-- Note: weather_notes removed - weather will be fetched via API using date and GPS coordinates
INSERT INTO outings (user_id, location_id, outing_date, worth_returning, field_notes, mvp_lure) VALUES
(1, 2, '2025-11-09', TRUE, NULL, NULL),
(1, 6, '2025-10-12', TRUE, NULL, NULL),
(1, 5, '2025-07-31', TRUE, NULL, NULL),
(1, 1, '2025-05-15', TRUE, NULL, NULL),
(1, 4, '2025-05-11', TRUE, NULL, NULL),
(1, 3, '2025-03-09', TRUE, NULL, NULL),
(1, 4, '2025-02-09', TRUE, NULL, NULL);

-- catches.
INSERT INTO catches (outing_id, species, count, notes) VALUES
(1, 'coho salmon', 8, 'coho rodeo #catchandrelease.'),
(2, 'chinook salmon', 4, 'stocked the freezer.'),
(3, 'brown trout', 3, 'sitting in the mud at the bottom.'),
(3, 'kokanee', 5, 'colored up'),
(4, 'rainbow trout', 13, 'hella sewer trout.'),
(5, 'bull trout', 1, 'one and done.'),
(6, 'rainbow trout', 15, 'prime conditions, stat padded the fly.'),
(7, 'bull trout', 1, 'slim dewd, mythical spotted pattern.');