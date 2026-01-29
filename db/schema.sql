/* -------------------- Fish Sesh Journal Database Schema ------------------- */

CREATE DATABASE IF NOT EXISTS fishedex;
USE fishedex;

-- users.
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    join_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- locations.
CREATE TABLE locations (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    location_name VARCHAR(255) NOT NULL,
    region VARCHAR(100),
    pinpoint VARCHAR(255),    -- Coordinates (lat,lng) for weather
    latitude DECIMAL(10, 8),   -- GPS latitude for weather API
    longitude DECIMAL(11, 8),  -- GPS longitude for weather API
    is_secret BOOLEAN DEFAULT FALSE,
    lore TEXT
);

-- outings.
CREATE TABLE outings (
    outing_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    location_id INT,
    outing_date DATE NOT NULL,
    worth_returning BOOLEAN,
    field_notes TEXT,
    mvp_lure TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
);

-- catches.
CREATE TABLE catches (
    catch_id INT AUTO_INCREMENT PRIMARY KEY,
    outing_id INT NOT NULL,
    species VARCHAR(100) NOT NULL,
    count INT DEFAULT 1,     -- Optional: average weight
    notes TEXT,
    FOREIGN KEY (outing_id) REFERENCES outings(outing_id)
);

-- fish pics.
CREATE TABLE catch_images (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    catch_id INT NOT NULL,
    image_url VARCHAR(255),        -- Optional: URL if storing externally
    image_data LONGBLOB,          -- BLOB for storing image binary data
    image_type VARCHAR(50),          -- MIME type (e.g., 'image/jpeg', 'image/png')
    caption VARCHAR(255),
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (catch_id) REFERENCES catches(catch_id),
    CHECK (image_url IS NOT NULL OR image_data IS NOT NULL)  -- At least one must be provided
);

-- scenery pics.
CREATE TABLE scenery_images (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    outing_id INT NOT NULL,
    image_url VARCHAR(255),        -- Optional: URL if storing externally
    image_data LONGBLOB,          -- BLOB for storing image binary data
    image_type VARCHAR(50),          -- MIME type (e.g., 'image/jpeg', 'image/png')
    caption VARCHAR(255),
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (outing_id) REFERENCES outings(outing_id),
    CHECK (image_url IS NOT NULL OR image_data IS NOT NULL)  -- At least one must be provided
);

-- location photos (photos associated directly with locations).
CREATE TABLE location_images (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    location_id INT NOT NULL,
    image_url VARCHAR(255),        -- Optional: URL if storing externally
    image_data LONGBLOB,          -- BLOB for storing image binary data
    image_type VARCHAR(50),          -- MIME type (e.g., 'image/jpeg', 'image/png')
    caption VARCHAR(255),
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(location_id),
    CHECK (image_url IS NOT NULL OR image_data IS NOT NULL)  -- At least one must be provided
);

/* --------------------------------- Views: --------------------------------- */

-- total fish caught per location and species.
CREATE VIEW fish_caught AS
SELECT
    l.location_name,
    l.region,
    c.species,
    SUM(c.count) AS total_caught
FROM locations l
JOIN outings o   ON l.location_id = o.location_id
JOIN catches c   ON o.outing_id   = c.outing_id
GROUP BY
    l.location_name,
    l.region,
    c.species;

/* ------------------------------- Procedures: ------------------------------ */

-- top 5 locations by species.
DELIMITER //
CREATE PROCEDURE bestspot_by_species(IN target_species VARCHAR(100))
BEGIN
  SELECT l.location_name,
         l.region,
         SUM(c.count) AS total_caught
  FROM locations l
  JOIN outings o ON l.location_id = o.location_id
  JOIN catches c ON o.outing_id = c.outing_id
  WHERE c.species = target_species
  GROUP BY l.location_name, l.region
  ORDER BY total_caught DESC
  LIMIT 5;
END//
DELIMITER ;

