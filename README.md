# FISH-E-DEX


A Poke-e-dex inspired Fishing Journal Web App built in React.

## Features

### Location Management
- Log new fishing locations with name, region, pinpoint (maps/address), and lore
- Browse all saved locations
- Edit and delete existing locations
- Mark locations as secret spots

### Outing Management
- Log fishing outings with date, location, field notes, and best lure
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
- Database & Auth: Supabase (PostgreSQL, Auth, Storage)
- Styling: CSS with custom retro animations

## Setup (For Your Own Personal DB)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

3. Set up the Supabase database (run in Supabase SQL Editor):
   - Create tables using `db/schema.supabase.sql` or migration scripts in `db/`
   - Create RLS policies using `db/policies.sql`

4. Start the development server:
   ```bash
   npm run dev
   ```

## A Lot More Coming Soon!