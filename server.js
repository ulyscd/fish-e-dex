/* ---------------------------- Fish-e-dex Server --------------------------- */

import express from 'express';
import mysql from 'mysql2';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
import axios from 'axios';

dotenv.config();
const app = express();
app.use(cors()); // Enable CORS for iOS app
app.use(express.json({ limit: '50mb' })); // Increase limit for image uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from public directory
app.use(express.static('public'));

// Configure multer for file uploads (in-memory storage for BLOB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// mysql connection pool.
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) console.error('Error connecting to fish-e-dex database:', err);
    else console.log('Connected to fish-e-dex database.');
});

/* ---------------------------- Helper Functions ---------------------------- */

// Parse coordinates from pinpoint field (lat,lng format only)
function parseCoordinates(pinpoint) {
  if (!pinpoint || typeof pinpoint !== 'string') return null;
  const trimmed = pinpoint.trim();
  const match = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { latitude: lat, longitude: lng };
}

// Convert Open-Meteo weather code to condition string
function getWeatherCondition(code) {
  // Open-Meteo weather codes: https://open-meteo.com/en/docs
  const weatherCodes = {
    0: 'Clear',
    1: 'Mainly Clear',
    2: 'Partly Cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing Rime Fog',
    51: 'Light Drizzle',
    53: 'Moderate Drizzle',
    55: 'Dense Drizzle',
    56: 'Light Freezing Drizzle',
    57: 'Dense Freezing Drizzle',
    61: 'Slight Rain',
    63: 'Moderate Rain',
    65: 'Heavy Rain',
    66: 'Light Freezing Rain',
    67: 'Heavy Freezing Rain',
    71: 'Slight Snow',
    73: 'Moderate Snow',
    75: 'Heavy Snow',
    77: 'Snow Grains',
    80: 'Slight Rain Showers',
    81: 'Moderate Rain Showers',
    82: 'Violent Rain Showers',
    85: 'Slight Snow Showers',
    86: 'Heavy Snow Showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with Hail',
    99: 'Thunderstorm with Heavy Hail'
  };
  return weatherCodes[code] || 'Unknown';
}

/* ---------------------------------- Users --------------------------------- */

// all users.
app.get("/users", (req, res) => {
  db.query("SELECT user_id, username, email, join_date FROM users", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

/* -------------------------------- Locations ------------------------------- */

// new location.
app.post("/location", (req, res) => {
    const { location_name, region, pinpoint, is_secret, lore } = req.body;
    if (!location_name) {
        return res.status(400).json({ error: "Must name the spot" });
    }

    const coords = parseCoordinates(pinpoint);
    const finalLat = coords ? coords.latitude : null;
    const finalLon = coords ? coords.longitude : null;

    const sql = `INSERT INTO locations (location_name, region, pinpoint, latitude, longitude, is_secret, lore)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [
        location_name,
        region,
        pinpoint,
        finalLat,
        finalLon,
        !!is_secret,
        lore
    ], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({
            message: "Location created",
            location_id: results.insertId,
            latitude: finalLat,
            longitude: finalLon
        });
    });
});

// all locations.
app.get("/locations", (req, res) => {
  db.query("SELECT * FROM locations", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// specific location by id.
app.get("/locations/:id", (req, res) => {
  db.query(
    "SELECT * FROM locations WHERE location_id = ?",
    [req.params.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0)
        return res.status(404).json({ error: "Location not found" });
      res.json(results[0]);
    }
  );
});

// update location by id.
app.put("/locations/:id", (req, res) => {
  const { location_name, region, pinpoint, is_secret, lore } = req.body;
  if (!location_name) {
    return res.status(400).json({ error: "Location name is required" });
  }

  const coords = parseCoordinates(pinpoint);
  const finalLat = coords ? coords.latitude : null;
  const finalLon = coords ? coords.longitude : null;

  const sql = `UPDATE locations
    SET location_name = ?, region = ?, pinpoint = ?, latitude = ?, longitude = ?, is_secret = ?, lore = ?
    WHERE location_id = ?`;

  db.query(
    sql,
    [location_name, region, pinpoint, finalLat, finalLon, !!is_secret, lore, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Location not found" });
      res.json({
        message: "Location updated",
        latitude: finalLat,
        longitude: finalLon
      });
    }
  );
});

// delete location by id.
app.delete("/locations/:id", (req, res) => {
  const locationId = req.params.id;
  
  // First, set location_id to NULL in outings to avoid foreign key constraint
  db.query(
    "UPDATE outings SET location_id = NULL WHERE location_id = ?",
    [locationId],
    (err, updateResult) => {
      if (err) {
        console.error('Error updating outings:', err);
        return res.status(500).json({ error: err.message, details: err.sqlMessage });
      }
      
      // Delete location images
      db.query(
        "DELETE FROM location_images WHERE location_id = ?",
        [locationId],
        (err, imageResult) => {
          if (err) {
            console.error('Error deleting location images:', err);
            return res.status(500).json({ error: err.message, details: err.sqlMessage });
          }
          
          // Now delete the location
          db.query(
            "DELETE FROM locations WHERE location_id = ?",
            [locationId],
            (err, result) => {
              if (err) {
                console.error('Error deleting location:', err);
                console.error('SQL Error Code:', err.code);
                console.error('SQL Error Message:', err.sqlMessage);
                return res.status(500).json({ error: err.message, details: err.sqlMessage, code: err.code });
              }
              if (result.affectedRows === 0)
                return res.status(404).json({ error: "Location not found" });
              res.json({ message: "Location deleted" });
            }
          );
        }
      );
    }
  );
});

/* --------------------------------- Outings -------------------------------- */

// create an outing.
app.post("/outings", (req, res) => {
  const {
    user_id,
    location_id,
    outing_date,
    worth_returning,
    field_notes,
    mvp_lure
  } = req.body;

  if (!user_id || !outing_date) {
    return res
      .status(400)
      .json({ error: "User's ID and the date are required" });
  }

  const sql = 
  `INSERT INTO outings
      (user_id, location_id, outing_date, worth_returning,
       field_notes, mvp_lure)
    VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(
    sql,
    [
      user_id,
      location_id || null,
      outing_date,
      !!worth_returning,
      field_notes,
      mvp_lure
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({
        message: "Outing created",
        outing_id: result.insertId
      });
    }
  );
});

// all outings.
app.get("/outings", (req, res) => {
  db.query("SELECT * FROM outings", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// specific outing by id.
app.get("/outings/:id", (req, res) => {
  db.query(
    "SELECT * FROM outings WHERE outing_id = ?",
    [req.params.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0)
        return res.status(404).json({ error: "Outing not found" });
      res.json(results[0]);
    }
  );
});

// update outing by id.
app.put("/outings/:id", (req, res) => {
  const {
    user_id,
    location_id,
    outing_date,
    worth_returning,
    field_notes,
    mvp_lure
  } = req.body;

  if (!user_id || !outing_date) {
    return res
      .status(400)
      .json({ error: "User's ID and the date are required" });
  }

  const sql = 
  `UPDATE outings
    SET user_id = ?, location_id = ?, outing_date = ?, worth_returning = ?,
        field_notes = ?, mvp_lure = ?
    WHERE outing_id = ?`;

  db.query(
    sql,
    [
      user_id,
      location_id || null,
      outing_date,
      !!worth_returning,
      field_notes,
      mvp_lure,
      req.params.id
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Outing not found" });
      res.json({ message: "Outing updated" });
    }
  );
});

// delete outing by id.
app.delete("/outings/:id", (req, res) => {
  const outingId = req.params.id;
  
  // Use a transaction-like approach: disable foreign key checks temporarily
  // This ensures we can delete in any order
  db.query("SET FOREIGN_KEY_CHECKS = 0", (err) => {
    if (err) {
      console.error('Error disabling foreign key checks:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // Delete all related records
    const queries = [
      // Delete catch images (need catch_ids first)
      (callback) => {
        db.query("SELECT catch_id FROM catches WHERE outing_id = ?", [outingId], (err, results) => {
          if (err) return callback(err);
          const catchIds = results.map(r => r.catch_id);
          if (catchIds.length === 0) return callback(null);
          
          const placeholders = catchIds.map(() => '?').join(',');
          db.query(`DELETE FROM catch_images WHERE catch_id IN (${placeholders})`, catchIds, callback);
        });
      },
      // Delete catches
      (callback) => {
        db.query("DELETE FROM catches WHERE outing_id = ?", [outingId], callback);
      },
      // Delete scenery images
      (callback) => {
        db.query("DELETE FROM scenery_images WHERE outing_id = ?", [outingId], callback);
      },
      // Delete the outing
      (callback) => {
        db.query("DELETE FROM outings WHERE outing_id = ?", [outingId], callback);
      }
    ];
    
    // Execute queries sequentially
    let index = 0;
    const runNext = (err) => {
      if (err) {
        // Re-enable foreign key checks even on error
        db.query("SET FOREIGN_KEY_CHECKS = 1", () => {});
        console.error(`[DELETE OUTING ${outingId}] Error at step ${index}:`, err);
        return res.status(500).json({ error: err.message, details: err.sqlMessage });
      }
      
      if (index >= queries.length) {
        // All queries completed, re-enable foreign key checks
        db.query("SET FOREIGN_KEY_CHECKS = 1", (fkErr) => {
          if (fkErr) {
            console.error('Error re-enabling foreign key checks:', fkErr);
          }
          res.json({ message: "Outing deleted" });
        });
        return;
      }
      
      queries[index]((queryErr, result) => {
        if (queryErr) {
          return runNext(queryErr);
        }
        index++;
        runNext(null);
      });
    };
    
    runNext(null);
  });
});

 /* ---------------------------- Catches and Pics ---------------------------- */

 // catches by outing id.
 app.get("/outings/:id/catches", (req, res) => {
  db.query(
    "SELECT * FROM catches WHERE outing_id = ?",
    [req.params.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// create a catch.
app.post("/catches", (req, res) => {
  const { outing_id, species, count, notes } = req.body;
  
  if (!outing_id || !species) {
    return res.status(400).json({ error: "Outing ID and species are required" });
  }

  const sql = `INSERT INTO catches (outing_id, species, count, notes)
    VALUES (?, ?, ?, ?)`;

  db.query(sql, [outing_id, species, count || 1, notes || null], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      message: "Catch created",
      catch_id: results.insertId
    });
  });
});

// catch pics by catch id.
app.get("/catch_images/:catch_id", (req, res) => {
  db.query(
    "SELECT image_id, catch_id, image_url, image_type, caption, uploaded_at FROM catch_images WHERE catch_id = ?",
    [req.params.catch_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// get catch image by image_id (returns image data as base64 or URL)
app.get("/catch_images/image/:image_id", (req, res) => {
  db.query(
    "SELECT image_id, catch_id, image_url, image_data, image_type, caption FROM catch_images WHERE image_id = ?",
    [req.params.image_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ error: "Image not found" });
      
      const image = results[0];
      if (image.image_data) {
        // Return image as base64
        const base64 = image.image_data.toString('base64');
        res.json({
          image_id: image.image_id,
          catch_id: image.catch_id,
          image_url: null,
          image_data: `data:${image.image_type};base64,${base64}`,
          image_type: image.image_type,
          caption: image.caption
        });
      } else {
        res.json(image);
      }
    }
  );
});

// upload catch image (supports both file upload and URL)
app.post("/catch_images", upload.single('image'), (req, res) => {
  const { catch_id, image_url, caption } = req.body;
  const file = req.file;
  
  if (!catch_id) {
    return res.status(400).json({ error: "Catch ID is required" });
  }
  
  if (!image_url && !file) {
    return res.status(400).json({ error: "Either image URL or file upload is required" });
  }

  let imageData = null;
  let imageType = null;
  
  if (file) {
    imageData = file.buffer;
    imageType = file.mimetype;
  }

  const sql = `INSERT INTO catch_images (catch_id, image_url, image_data, image_type, caption)
    VALUES (?, ?, ?, ?, ?)`;

  db.query(sql, [
    catch_id, 
    image_url || null, 
    imageData, 
    imageType || null, 
    caption || null
  ], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      message: "Catch image uploaded",
      image_id: results.insertId
    });
  });
});

// scenery pics by outing id.
app.get("/scenery_images/:outing_id", (req, res) => {
  db.query(
    "SELECT image_id, outing_id, image_url, image_type, caption, uploaded_at FROM scenery_images WHERE outing_id = ?",
    [req.params.outing_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// get scenery image by image_id (returns image data as base64 or URL)
app.get("/scenery_images/image/:image_id", (req, res) => {
  db.query(
    "SELECT image_id, outing_id, image_url, image_data, image_type, caption FROM scenery_images WHERE image_id = ?",
    [req.params.image_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ error: "Image not found" });
      
      const image = results[0];
      if (image.image_data) {
        // Return image as base64
        const base64 = image.image_data.toString('base64');
        res.json({
          image_id: image.image_id,
          outing_id: image.outing_id,
          image_url: null,
          image_data: `data:${image.image_type};base64,${base64}`,
          image_type: image.image_type,
          caption: image.caption
        });
      } else {
        res.json(image);
      }
    }
  );
});

// upload scenery image (supports both file upload and URL)
app.post("/scenery_images", upload.single('image'), (req, res) => {
  const { outing_id, image_url, caption } = req.body;
  const file = req.file;
  
  if (!outing_id) {
    return res.status(400).json({ error: "Outing ID is required" });
  }
  
  if (!image_url && !file) {
    return res.status(400).json({ error: "Either image URL or file upload is required" });
  }

  let imageData = null;
  let imageType = null;
  
  if (file) {
    imageData = file.buffer;
    imageType = file.mimetype;
  }

  const sql = `INSERT INTO scenery_images (outing_id, image_url, image_data, image_type, caption)
    VALUES (?, ?, ?, ?, ?)`;

  db.query(sql, [
    outing_id, 
    image_url || null, 
    imageData, 
    imageType || null, 
    caption || null
  ], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      message: "Scenery image uploaded",
      image_id: results.insertId
    });
  });
});

/* ---------------------------- Location Images ---------------------------- */

// location pics by location id.
app.get("/location_images/:location_id", (req, res) => {
  db.query(
    "SELECT image_id, location_id, image_url, image_type, caption, uploaded_at FROM location_images WHERE location_id = ?",
    [req.params.location_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// get location image by image_id (returns image data as base64 or URL)
app.get("/location_images/image/:image_id", (req, res) => {
  db.query(
    "SELECT image_id, location_id, image_url, image_data, image_type, caption FROM location_images WHERE image_id = ?",
    [req.params.image_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ error: "Image not found" });
      
      const image = results[0];
      if (image.image_data) {
        // Return image as base64
        const base64 = image.image_data.toString('base64');
        res.json({
          image_id: image.image_id,
          location_id: image.location_id,
          image_url: null,
          image_data: `data:${image.image_type};base64,${base64}`,
          image_type: image.image_type,
          caption: image.caption
        });
      } else {
        res.json(image);
      }
    }
  );
});

// upload location image (supports both file upload and URL)
app.post("/location_images", upload.single('image'), (req, res) => {
  const { location_id, image_url, caption } = req.body;
  const file = req.file;
  
  if (!location_id) {
    return res.status(400).json({ error: "Location ID is required" });
  }
  
  if (!image_url && !file) {
    return res.status(400).json({ error: "Either image URL or file upload is required" });
  }

  let imageData = null;
  let imageType = null;
  
  if (file) {
    imageData = file.buffer;
    imageType = file.mimetype;
  }

  const sql = `INSERT INTO location_images (location_id, image_url, image_data, image_type, caption)
    VALUES (?, ?, ?, ?, ?)`;

  db.query(sql, [
    location_id, 
    image_url || null, 
    imageData, 
    imageType || null, 
    caption || null
  ], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      message: "Location image uploaded",
      image_id: results.insertId
    });
  });
});

/* --------------------- Joins/Views/Procedure Endpoints -------------------- */

// joins: 

// outings including location name + region.
app.get("/outings_plus_locations", (req, res) => {
  const sql = `
    SELECT o.outing_id, o.outing_date, o.worth_returning,
           l.location_name, l.region, l.latitude, l.longitude
    FROM outings o
    JOIN locations l ON o.location_id = l.location_id
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// views: 

// catch totals by location.
app.get("/fish_caught", (req, res) => {
  db.query("SELECT * FROM fish_caught", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// stored procedures:

// best location by species.
app.get("/best_spots", (req, res) => {
  const species = req.query.species || "Rainbow Trout"; // rainbow by default if none provided.
  db.query("CALL bestspot_by_species(?)", [species], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});

/* ---------------------------- Weather API Endpoints ---------------------------- */

// Fetch weather for an outing (on demand; requires date and location with coordinates)
app.get("/outings/:id/weather", async (req, res) => {
  const outingId = req.params.id;
  
  const sql = `
    SELECT o.outing_id, o.outing_date,
           l.location_id, l.pinpoint, l.latitude, l.longitude
    FROM outings o
    LEFT JOIN locations l ON o.location_id = l.location_id
    WHERE o.outing_id = ?
  `;
  
  db.query(sql, [outingId], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "Outing not found" });
    
    const outing = results[0];
    
    if (!outing.outing_date) {
      return res.status(400).json({ error: "Cannot fetch weather: outing must have a date" });
    }
    
    if (!outing.location_id) {
      return res.status(400).json({
        error: "Cannot fetch weather: outing must have a location. Add a location with coordinates (lat,lng)."
      });
    }
    
    let latitude = outing.latitude != null ? Number(outing.latitude) : null;
    let longitude = outing.longitude != null ? Number(outing.longitude) : null;
    if ((latitude == null || longitude == null) && outing.pinpoint) {
      const coords = parseCoordinates(outing.pinpoint);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    }
    if (latitude == null || longitude == null) {
      return res.status(400).json({
        error: "Cannot fetch weather: location must have coordinates. Add coordinates (lat,lng) for this spot."
      });
    }
    
    // Ensure YYYY-MM-DD for Open-Meteo
    const dateObj = outing.outing_date instanceof Date ? outing.outing_date : new Date(outing.outing_date);
    const dateStr = dateObj.toISOString().slice(0, 10);
    
    try {
      const apiKey = process.env.WEATHER_API_KEY;
      let weather;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const outingDate = new Date(dateStr);
      outingDate.setHours(0, 0, 0, 0);
      const isHistorical = outingDate < today;
      
      if (isHistorical) {
        const weatherUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${dateStr}&end_date=${dateStr}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,windspeed_10m_max&timezone=auto&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch`;
        const weatherResponse = await axios.get(weatherUrl);
        const data = weatherResponse.data;
        
        if (data.daily && data.daily.time && data.daily.time.length > 0) {
          weather = {
            main: {
              temp: (data.daily.temperature_2m_max[0] + data.daily.temperature_2m_min[0]) / 2,
              temp_max: data.daily.temperature_2m_max[0],
              temp_min: data.daily.temperature_2m_min[0],
              humidity: null,
              pressure: null
            },
            weather: [{ main: getWeatherCondition(data.daily.weathercode[0]) }],
            wind: { speed: data.daily.windspeed_10m_max[0] || 0, deg: null },
            precipitation: data.daily.precipitation_sum[0] || 0
          };
        } else {
          throw new Error('No historical weather data available for this date');
        }
      } else if (apiKey) {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=imperial`;
        const weatherResponse = await axios.get(weatherUrl);
        const ow = weatherResponse.data;
        weather = {
          main: ow.main,
          weather: ow.weather,
          wind: ow.wind,
          precipitation: ow.rain?.['1h'] ?? ow.rain?.['3h'] ?? null
        };
      } else {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch`;
        const weatherResponse = await axios.get(weatherUrl);
        const data = weatherResponse.data;
        const daily = data.daily && data.daily.time && data.daily.time.length > 0 ? data.daily : null;
        weather = {
          main: {
            temp: data.current.temperature_2m,
            temp_max: daily ? daily.temperature_2m_max[0] : null,
            temp_min: daily ? daily.temperature_2m_min[0] : null,
            humidity: data.current.relative_humidity_2m,
            pressure: data.current.surface_pressure
          },
          weather: [{ main: getWeatherCondition(data.current.weathercode) }],
          wind: {
            speed: data.current.wind_speed_10m || 0,
            deg: data.current.wind_direction_10m
          },
          precipitation: daily && daily.precipitation_sum ? daily.precipitation_sum[0] : null
        };
      }
      
      const response = {
        outing_id: parseInt(outingId),
        temperature: weather.main.temp,
        temperature_max: weather.main.temp_max ?? null,
        temperature_min: weather.main.temp_min ?? null,
        temperature_unit: 'fahrenheit',
        conditions: weather.weather[0].main,
        humidity: weather.main.humidity,
        wind_speed: weather.wind?.speed || 0,
        wind_direction: weather.wind?.deg != null ? `${weather.wind.deg}°` : null,
        pressure: weather.main.pressure,
        precipitation: weather.precipitation ?? null,
        fetched_at: new Date()
      };
      res.json(response);
    } catch (apiError) {
      const details = apiError.response?.data?.reason || apiError.response?.data?.error || apiError.message;
      console.error('Weather API error:', details);
      res.status(500).json({
        error: details ? String(details) : "Failed to fetch weather data",
        details: String(details || "")
      });
    }
  });
});

/* --------------------------------- Server: -------------------------------- */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Fish-e-dex API running on port ${PORT}`));