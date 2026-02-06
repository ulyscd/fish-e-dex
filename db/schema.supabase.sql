/* -------------------- Fish-e-dex Supabase (PostgreSQL) Schema ------------------- */

-- users.
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    join_date TIMESTAMPTZ DEFAULT NOW()
);

-- locations.
CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    location_name VARCHAR(255) NOT NULL,
    region VARCHAR(100),
    pinpoint VARCHAR(255),    -- Coordinates (lat,lng) for weather
    latitude DECIMAL(10, 8),  -- GPS latitude for weather API
    longitude DECIMAL(11, 8), -- GPS longitude for weather API
    is_secret BOOLEAN DEFAULT FALSE,
    lore TEXT
);

-- outings.
CREATE TABLE outings (
    outing_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id),
    location_id INT REFERENCES locations(location_id) ON DELETE SET NULL,
    outing_date DATE NOT NULL,
    worth_returning BOOLEAN,
    field_notes TEXT,
    best_lure TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- catches.
CREATE TABLE catches (
    catch_id SERIAL PRIMARY KEY,
    outing_id INT NOT NULL REFERENCES outings(outing_id) ON DELETE CASCADE,
    species VARCHAR(100) NOT NULL,
    count INT DEFAULT 1,
    notes TEXT
);

-- fish pics (image_url points to Supabase Storage).
CREATE TABLE catch_images (
    image_id SERIAL PRIMARY KEY,
    catch_id INT NOT NULL REFERENCES catches(catch_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,       -- Supabase Storage public URL
    image_type VARCHAR(50),        -- MIME type (e.g. 'image/jpeg', 'image/png')
    caption VARCHAR(255),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- scenery pics (image_url points to Supabase Storage).
CREATE TABLE scenery_images (
    image_id SERIAL PRIMARY KEY,
    outing_id INT NOT NULL REFERENCES outings(outing_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_type VARCHAR(50),
    caption VARCHAR(255),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

/* --------------------------------- Views --------------------------------- */

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

/* ------------------------------- Functions --------------------------------- */

-- top 5 locations by species.
CREATE OR REPLACE FUNCTION bestspot_by_species(target_species VARCHAR(100))
RETURNS TABLE (
    location_name VARCHAR(255),
    region VARCHAR(100),
    total_caught BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.location_name,
        l.region,
        SUM(c.count)::BIGINT AS total_caught
    FROM locations l
    JOIN outings o ON l.location_id = o.location_id
    JOIN catches c ON o.outing_id = c.outing_id
    WHERE c.species = target_species
    GROUP BY l.location_name, l.region
    ORDER BY total_caught DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;
