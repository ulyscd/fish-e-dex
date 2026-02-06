/**
 * Client-side weather fetching via Open-Meteo (no API key required).
 * Supports historical (archive) and current/forecast data.
 */

function getWeatherCondition(code) {
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
  }
  return weatherCodes[code] || 'Unknown'
}

export async function fetchWeatherForOuting(outingId, outingDate, latitude, longitude, pinpoint) {
  let lat = latitude != null ? Number(latitude) : null
  let lng = longitude != null ? Number(longitude) : null

  if ((lat == null || lng == null) && pinpoint) {
    const match = String(pinpoint).trim().match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/)
    if (match) {
      lat = parseFloat(match[1])
      lng = parseFloat(match[2])
    }
  }

  if (lat == null || lng == null) {
    throw new Error('Location must have coordinates (lat,lng)')
  }

  const dateStr = outingDate instanceof Date
    ? outingDate.toISOString().slice(0, 10)
    : new Date(outingDate).toISOString().slice(0, 10)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const outingDateObj = new Date(dateStr)
  outingDateObj.setHours(0, 0, 0, 0)
  const isHistorical = outingDateObj < today

  let weather

  if (isHistorical) {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${dateStr}&end_date=${dateStr}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,windspeed_10m_max&timezone=auto&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch historical weather')
    const data = await res.json()

    if (data.daily?.time?.length > 0) {
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
      }
    } else {
      throw new Error('No historical weather data available for this date')
    }
  } else {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch weather')
    const data = await res.json()
    const daily = data.daily?.time?.length > 0 ? data.daily : null

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
      precipitation: daily?.precipitation_sum?.[0] ?? null
    }
  }

  return {
    outing_id: parseInt(outingId, 10),
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
  }
}
