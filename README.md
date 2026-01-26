# Fish-e-dex

A retro-styled fishing journal web application for logging fishing outings, locations, catches, and insights.

## Features

### Location Management
- Log new fishing locations with name, region, pinpoint (maps/address), and lore
- Browse all saved locations
- Edit and delete existing locations
- Mark locations as secret spots

### Outing Management
- Log fishing outings with date, location, field notes, and MVP lure
- Track multiple catches per outing (species, count, notes)
- Browse all outings sorted by most recent
- Expand outings to view full details, catches, and attached photos
- Edit and delete existing outings

### Photo Management
- Upload photos for catches and scenery
- Attach multiple images per catch or outing
- View photos when browsing outings

### Weather Data
- Fetch historical weather conditions for outings
- Automatic geocoding of locations for accurate weather data
- Weather data cached for performance

### Data Insights
- View total fish caught by location and species
- Discover best spots by species
- Filter insights by species

## Tech Stack
- Frontend: React, Vite
- Backend: Node.js, Express
- Database: MySQL
- Styling: CSS with custom retro animations

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=fishedex
   OPENWEATHER_API_KEY=your_key (optional)
   ```

3. Set up the database:
   ```bash
   mysql -u your_username -p < db/schema.sql
   mysql -u your_username -p < db/seed.sql
   ```

4. Start the server:
   ```bash
   node server.js
   ```

5. Start the development server (in a separate terminal):
   ```bash
   npm run dev
   ```

## A Lot More Coming Soon!