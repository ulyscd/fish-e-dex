import { useState, useEffect } from 'react'
import axios from 'axios'
import Popup from './Popup'
import './OutingView.css'

/* --------------- Constants --------------- */
const API_BASE = '/api'

/* --------------- OutingView (main) --------------- */
function OutingView({ onBack }) {
  const [activeTab, setActiveTab] = useState('log') // 'log' or 'browse'
  const [locations, setLocations] = useState([])
  const [formData, setFormData] = useState({
    user_id: 1, // Default user for now
    location_id: '',
    outing_date: new Date().toISOString().split('T')[0],
    worth_returning: false,
    field_notes: '',
    mvp_lure: ''
  })
  const [catches, setCatches] = useState([{ species: '', count: 1, notes: '', _localId: `catch-${Date.now()}` }])
  const [showCatches, setShowCatches] = useState(false)
  const [pendingCatchImages, setPendingCatchImages] = useState({}) // { [catchLocalId]: [{ file, caption }] }
  const [showImagePopup, setShowImagePopup] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedCatchIndex, setSelectedCatchIndex] = useState(null)

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API_BASE}/locations`)
      setLocations(response.data)
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const outingResponse = await axios.post(`${API_BASE}/outings`, {
        ...formData,
        location_id: formData.location_id || null
      })
      const outingId = outingResponse.data.outing_id

      for (const catchItem of catches) {
        if (!catchItem.species) continue
        const catchResponse = await axios.post(`${API_BASE}/catches`, {
          outing_id: outingId,
          species: catchItem.species,
          count: catchItem.count || 1,
          notes: catchItem.notes || null
        })
        const catchId = catchResponse.data.catch_id
        const pending = pendingCatchImages[catchItem._localId] || []
        for (const { file, caption } of pending) {
          const formDataImg = new FormData()
          formDataImg.append('image', file)
          formDataImg.append('catch_id', catchId)
          if (caption) formDataImg.append('caption', caption)
          await axios.post(`${API_BASE}/catch_images`, formDataImg, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        }
      }

      setShowSuccess(true)
      setFormData({
        user_id: 1,
        location_id: '',
        outing_date: new Date().toISOString().split('T')[0],
        worth_returning: false,
        field_notes: '',
        mvp_lure: ''
      })
      setCatches([{ species: '', count: 1, notes: '', _localId: `catch-${Date.now()}` }])
      setShowCatches(false)
      setPendingCatchImages({})
    } catch (error) {
      console.error('Error creating outing:', error)
      alert('Failed to create outing: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleCatchChange = (index, field, value) => {
    const newCatches = [...catches]
    newCatches[index] = { ...newCatches[index], [field]: value }
    setCatches(newCatches)
  }

  const addCatch = () => {
    setCatches([...catches, { species: '', count: 1, notes: '', _localId: `catch-${Date.now()}` }])
  }

  const handleCaughtSomething = () => {
    setShowCatches(true)
    if (catches.length === 0) {
      setCatches([{ species: '', count: 1, notes: '', _localId: `catch-${Date.now()}` }])
    }
  }

  const handleNoCatches = () => {
    setShowCatches(false)
    setCatches([{ species: '', count: 1, notes: '', _localId: `catch-${Date.now()}` }])
    setPendingCatchImages({})
  }

  const removeCatch = (index) => {
    const next = catches.filter((_, i) => i !== index)
    if (next.length === 0) {
      setShowCatches(false)
      setCatches([{ species: '', count: 1, notes: '', _localId: `catch-${Date.now()}` }])
      setPendingCatchImages({})
    } else {
      const removedId = catches[index]._localId
      setCatches(next)
      setPendingCatchImages(prev => {
        const nextPending = { ...prev }
        delete nextPending[removedId]
        return nextPending
      })
    }
  }

  const savePendingImage = (catchLocalId, file, caption) => {
    setPendingCatchImages(prev => ({
      ...prev,
      [catchLocalId]: [...(prev[catchLocalId] || []), { file, caption: caption || '' }]
    }))
  }

  const removePendingImage = (catchLocalId, imageIndex) => {
    setPendingCatchImages(prev => {
      const list = (prev[catchLocalId] || []).filter((_, i) => i !== imageIndex)
      if (list.length === 0) {
        const next = { ...prev }
        delete next[catchLocalId]
        return next
      }
      return { ...prev, [catchLocalId]: list }
    })
  }

  const openImageUpload = (catchIndex) => {
    setSelectedCatchIndex(catchIndex)
    setShowImagePopup(true)
  }

  return (
    <div className="outing-view">
      {/* Top bar: back to main menu + "Outings" title */}
      <div className="view-header">
        <button className="back-button" onClick={onBack}>
          <img src="/media/bluearth.gif" alt="Back" className="back-gif" />
        </button>
        <h2>Outings</h2>
      </div>

      {/* Tabs: Log (new outing + catches + pending photos) vs Browse (list/expand/edit) */}
      <div className="tab-container">
        <button
          className={`tab-button ${activeTab === 'log' ? 'active' : ''}`}
          onClick={() => setActiveTab('log')}
        >
          Log
        </button>
        <button
          className={`tab-button ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          Browse
        </button>
      </div>

      {activeTab === 'log' && (
        <form className="outing-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              name="outing_date"
              value={formData.outing_date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <select
              name="location_id"
              value={formData.location_id}
              onChange={handleChange}
            >
              <option value="">Select location...</option>
              {locations.map(loc => (
                <option key={loc.location_id} value={loc.location_id}>
                  {loc.location_name} {loc.region ? `- ${loc.region}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              name="worth_returning"
              checked={formData.worth_returning}
              onChange={handleChange}
            />
            Worth Returning
          </label>
        </div>

        <div className="form-group">
          <label>Field Notes</label>
          <textarea
            name="field_notes"
            value={formData.field_notes}
            onChange={handleChange}
            rows="3"
            placeholder="Notes about the outing..."
          />
        </div>

        <div className="form-group">
          <label>MVP Lure</label>
          <input
            type="text"
            name="mvp_lure"
            value={formData.mvp_lure}
            onChange={handleChange}
            placeholder="Most effective lure used"
          />
        </div>

        {/* Optional: reveal catch rows; "I didn't catch anything" hides section */}
        {!showCatches && (
          <div className="caught-something-section">
            <button 
              type="button" 
              onClick={handleCaughtSomething}
              className="caught-something-button"
            >
              🎣 I Caught Something!
            </button>
          </div>
        )}

        {showCatches && (
        <div className="catches-section">
          <div className="section-header">
            <h3>Catches</h3>
            <div className="section-header-actions">
              <button type="button" onClick={addCatch} className="add-button">
                + Add Catch
              </button>
              <button type="button" onClick={handleNoCatches} className="no-catches-button">
                I didn&apos;t catch anything
              </button>
            </div>
          </div>

          {catches.map((catchItem, index) => (
            <div key={catchItem._localId} className="catch-item">
              <div className="form-row">
                <div className="form-group">
                  <label>Species *</label>
                  <input
                    type="text"
                    value={catchItem.species}
                    onChange={(e) => handleCatchChange(index, 'species', e.target.value)}
                    placeholder="coho salmon"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Count</label>
                  <input
                    type="number"
                    value={catchItem.count}
                    onChange={(e) => handleCatchChange(index, 'count', parseInt(e.target.value) || 1)}
                    min="1"
                  />
                </div>
              </div>
              <div className="form-group">
                <label> </label>
                <input
                  type="text"
                  value={catchItem.notes}
                  onChange={(e) => handleCatchChange(index, 'notes', e.target.value)}
                  placeholder="Catch notes..."
                />
              </div>
              {/* Pending photos uploaded with outing on Save; count shown on button */}
              <div className="catch-actions">
                <button
                  type="button"
                  onClick={() => openImageUpload(index)}
                  className="image-button"
                  title="Add photo (saved with outing)"
                >
                  📷 Add Photo
                  {(pendingCatchImages[catchItem._localId]?.length || 0) > 0 && (
                    <span className="pending-count"> ({pendingCatchImages[catchItem._localId].length})</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => removeCatch(index)}
                  className="remove-button"
                >
                  Remove catch
                </button>
              </div>
              {(pendingCatchImages[catchItem._localId]?.length || 0) > 0 && (
                <div className="pending-images">
                  {pendingCatchImages[catchItem._localId].map((item, imgIdx) => (
                    <span key={imgIdx} className="pending-thumb">
                      📷
                      <button type="button" onClick={() => removePendingImage(catchItem._localId, imgIdx)} className="remove-pending" aria-label="Remove photo">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        )}

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Saving...' : 'Save Outing'}
        </button>
      </form>
      )}

      {activeTab === 'browse' && (
        <OutingBrowser />
      )}

      {showImagePopup && selectedCatchIndex !== null && (
        <ImageUploadPopup
          onClose={() => {
            setShowImagePopup(false)
            setSelectedCatchIndex(null)
          }}
          catchIndex={selectedCatchIndex}
          catchId={null}
          catchLocalId={catches[selectedCatchIndex]?._localId}
          onSavePending={savePendingImage}
        />
      )}

      {/* Success overlay: champloo gif + "Outing saved!" */}
      {showSuccess && (
        <Popup onClose={() => setShowSuccess(false)}>
          <img src="/media/champloo.gif" alt="Success" className="success-gif" />
          <p>Outing saved!</p>
        </Popup>
      )}
    </div>
  )
}

/* --------------- OutingBrowser (sub-component) --------------- */
function OutingBrowser() {
  const [outings, setOutings] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editFormData, setEditFormData] = useState(null)
  const [catches, setCatches] = useState({})
  const [images, setImages] = useState({})
  const [weather, setWeather] = useState({})
  const [weatherLoading, setWeatherLoading] = useState({})

  useEffect(() => {
    fetchOutings()
    fetchLocations()
  }, [])

  const fetchOutings = async () => {
    try {
      const response = await axios.get(`${API_BASE}/outings_plus_locations`)
      // Sort by most recent first
      const sorted = response.data.sort((a, b) => {
        const dateA = new Date(a.outing_date)
        const dateB = new Date(b.outing_date)
        return dateB - dateA
      })
      setOutings(sorted)
    } catch (error) {
      console.error('Error fetching outings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API_BASE}/locations`)
      setLocations(response.data)
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  const handleExpand = async (outingId) => {
    if (expandedId === outingId) {
      setExpandedId(null)
      return
    }
    
    setExpandedId(outingId)
    
    // Fetch catches and images if not already loaded
    if (!catches[outingId]) {
      try {
        const [catchesRes, sceneryRes] = await Promise.all([
          axios.get(`${API_BASE}/outings/${outingId}/catches`),
          axios.get(`${API_BASE}/scenery_images/${outingId}`)
        ])
        
        setCatches(prev => ({ ...prev, [outingId]: catchesRes.data }))
        
        // Fetch catch images for each catch
        const catchImagesPromises = catchesRes.data.map(catchItem => 
          axios.get(`${API_BASE}/catch_images/${catchItem.catch_id}`)
        )
        const catchImagesRes = await Promise.all(catchImagesPromises)
        
        const allImages = {
          scenery: sceneryRes.data,
          catches: catchImagesRes.map(res => res.data).flat()
        }
        setImages(prev => ({ ...prev, [outingId]: allImages }))
      } catch (error) {
        console.error('Error fetching outing details:', error)
      }
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this outing?')) return
    
    try {
      await axios.delete(`${API_BASE}/outings/${id}`)
      fetchOutings()
      if (expandedId === id) {
        setExpandedId(null)
      }
    } catch (error) {
      console.error('Error deleting outing:', error)
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to delete outing'
      console.error('Error details:', error.response?.data)
      alert(`Failed to delete outing: ${errorMessage}`)
    }
  }

  const handleEdit = async (outing) => {
    try {
      // Fetch full outing data to get all fields
      const response = await axios.get(`${API_BASE}/outings/${outing.outing_id}`)
      const fullOuting = response.data
      
      // Fetch location data if location_id exists
      let locationPinpoint = ''
      if (fullOuting.location_id) {
        try {
          const locationResponse = await axios.get(`${API_BASE}/locations/${fullOuting.location_id}`)
          locationPinpoint = locationResponse.data.pinpoint || ''
        } catch (locError) {
          console.error('Error fetching location:', locError)
        }
      }
      
      setEditingId(outing.outing_id)
      setEditFormData({
        user_id: fullOuting.user_id || 1,
        location_id: fullOuting.location_id || '',
        outing_date: fullOuting.outing_date ? new Date(fullOuting.outing_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        worth_returning: fullOuting.worth_returning === true || fullOuting.worth_returning === 1,
        field_notes: fullOuting.field_notes || '',
        mvp_lure: fullOuting.mvp_lure || '',
        location_pinpoint: locationPinpoint
      })
      // Collapse if expanded
      if (expandedId === outing.outing_id) {
        setExpandedId(null)
      }
    } catch (error) {
      console.error('Error fetching outing for edit:', error)
      alert('Failed to load outing data for editing')
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    try {
      // Update outing
      await axios.put(`${API_BASE}/outings/${editingId}`, editFormData)
      
      // Update location pinpoint if location_id exists and pinpoint was changed
      if (editFormData.location_id && editFormData.location_pinpoint !== undefined) {
        try {
          // Fetch current location to get all fields
          const locationResponse = await axios.get(`${API_BASE}/locations/${editFormData.location_id}`)
          const currentLocation = locationResponse.data
          
          // Update location with new pinpoint
          await axios.put(`${API_BASE}/locations/${editFormData.location_id}`, {
            location_name: currentLocation.location_name,
            region: currentLocation.region || '',
            pinpoint: editFormData.location_pinpoint,
            is_secret: currentLocation.is_secret || false,
            lore: currentLocation.lore || ''
          })
        } catch (locError) {
          console.error('Error updating location:', locError)
          // Don't fail the whole operation if location update fails
        }
      }
      
      setEditingId(null)
      setEditFormData(null)
      fetchOutings()
    } catch (error) {
      console.error('Error updating outing:', error)
      alert('Failed to update outing')
    }
  }

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const fetchWeather = async (outingId) => {
    setWeatherLoading(prev => ({ ...prev, [outingId]: true }))
    try {
      const response = await axios.get(`${API_BASE}/outings/${outingId}/weather`)
      setWeather(prev => ({ ...prev, [outingId]: response.data }))
    } catch (error) {
      console.error('Error fetching weather:', error)
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to fetch weather'
      alert(`Failed to fetch weather: ${errorMessage}`)
    } finally {
      setWeatherLoading(prev => ({ ...prev, [outingId]: false }))
    }
  }

  if (loading) {
    return <div className="loading">Loading outings...</div>
  }

  return (
    <div className="outing-browser">
      {outings.length === 0 ? (
        <div className="no-data">No outings found</div>
      ) : (
        <div className="outing-list">
          {outings.map(outing => (
            <div key={outing.outing_id} className="outing-item">
              {editingId === outing.outing_id ? (
                <form className="edit-form" onSubmit={handleEditSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Date *</label>
                      <input
                        type="date"
                        name="outing_date"
                        value={editFormData.outing_date}
                        onChange={handleEditChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Location</label>
                      <select
                        name="location_id"
                        value={editFormData.location_id}
                        onChange={handleEditChange}
                      >
                        <option value="">Select location...</option>
                        {locations.map(loc => (
                          <option key={loc.location_id} value={loc.location_id}>
                            {loc.location_name} {loc.region ? `- ${loc.region}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* Location coords: used for weather fetch when expanding outing */}
                  {editFormData.location_id && (
                    <div className="form-group">
                      <label>Coordinates (lat,lng)</label>
                      <input
                        type="text"
                        name="location_pinpoint"
                        value={editFormData.location_pinpoint || ''}
                        onChange={handleEditChange}
                        placeholder="e.g. 45.5231,-122.6765"
                      />
                      <small style={{ fontSize: '0.5rem', color: 'var(--beige-dark)', display: 'block', marginTop: '0.5rem' }}>
                        Enter coordinates for this spot to enable weather fetching
                      </small>
                    </div>
                  )}
                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        name="worth_returning"
                        checked={editFormData.worth_returning}
                        onChange={handleEditChange}
                      />
                      Worth Returning
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Field Notes</label>
                    <textarea
                      name="field_notes"
                      value={editFormData.field_notes}
                      onChange={handleEditChange}
                      rows="3"
                    />
                  </div>
                  <div className="form-group">
                    <label>MVP Lure</label>
                    <input
                      type="text"
                      name="mvp_lure"
                      value={editFormData.mvp_lure}
                      onChange={handleEditChange}
                      placeholder="Best performing lure"
                    />
                  </div>
                  <div className="edit-actions">
                    <button type="submit" className="save-button">Save</button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null)
                        setEditFormData(null)
                      }}
                      className="cancel-button"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div
                    className="outing-item-header"
                    onClick={() => handleExpand(outing.outing_id)}
                  >
                    <div className="outing-item-main">
                      <h3>{new Date(outing.outing_date).toLocaleDateString()}</h3>
                      {outing.location_name && (
                        <p className="outing-location">
                          {outing.location_name} {outing.region ? `- ${outing.region}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="outing-item-actions">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleEdit(outing)
                        }}
                        className="edit-button"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDelete(outing.outing_id)
                        }}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {expandedId === outing.outing_id && (
                    <div className="outing-item-expanded">
                  <div className="outing-details">
                    {outing.worth_returning !== null && (
                      <p><strong>Worth Returning:</strong> {outing.worth_returning ? 'Yes' : 'No'}</p>
                    )}
                    {outing.field_notes && (
                      <p><strong>Field Notes:</strong> {outing.field_notes}</p>
                    )}
                    {outing.mvp_lure && (
                      <p><strong>MVP Lure:</strong> {outing.mvp_lure}</p>
                    )}
                    
                    {/* Weather: on-demand from location coords + outing date; not stored in DB */}
                    <div className="weather-section">
                      <div className="weather-header">
                        <h4>Weather</h4>
                        <button
                          type="button"
                          onClick={() => fetchWeather(outing.outing_id)}
                          className="weather-button"
                          disabled={weatherLoading[outing.outing_id]}
                        >
                          {weatherLoading[outing.outing_id] ? 'Loading...' : '🌤️ Fetch Weather'}
                        </button>
                      </div>
                      {weather[outing.outing_id] && (
                        <div className="weather-data">
                          {weather[outing.outing_id].temperature != null && (
                            <p><strong>Temperature:</strong> {weather[outing.outing_id].temperature}°{weather[outing.outing_id].temperature_unit === 'fahrenheit' ? 'F' : 'C'}</p>
                          )}
                          {(weather[outing.outing_id].temperature_max != null || weather[outing.outing_id].temperature_min != null) && (
                            <p><strong>High / Low:</strong> {weather[outing.outing_id].temperature_max != null ? `${weather[outing.outing_id].temperature_max}°` : '—'} / {weather[outing.outing_id].temperature_min != null ? `${weather[outing.outing_id].temperature_min}°` : '—'}{weather[outing.outing_id].temperature_unit === 'fahrenheit' ? 'F' : 'C'}</p>
                          )}
                          {weather[outing.outing_id].conditions && (
                            <p><strong>Conditions:</strong> {weather[outing.outing_id].conditions}</p>
                          )}
                          {weather[outing.outing_id].humidity !== null && weather[outing.outing_id].humidity !== undefined && (
                            <p><strong>Humidity:</strong> {weather[outing.outing_id].humidity}%</p>
                          )}
                          {weather[outing.outing_id].wind_speed != null && weather[outing.outing_id].wind_speed !== '' && (
                            <p><strong>Wind Speed:</strong> {weather[outing.outing_id].wind_speed} mph</p>
                          )}
                          {weather[outing.outing_id].wind_direction && (
                            <p><strong>Wind Direction:</strong> {weather[outing.outing_id].wind_direction}</p>
                          )}
                          {weather[outing.outing_id].pressure != null && (
                            <p><strong>Pressure:</strong> {weather[outing.outing_id].pressure} hPa</p>
                          )}
                          {weather[outing.outing_id].precipitation != null && weather[outing.outing_id].precipitation !== '' && (
                            <p><strong>Precipitation:</strong> {weather[outing.outing_id].precipitation} in</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Catches list: species, count, notes (from API) */}
                  {catches[outing.outing_id] && catches[outing.outing_id].length > 0 && (
                    <div className="outing-catches">
                      <h4>Catches</h4>
                      {catches[outing.outing_id].map(catchItem => (
                        <div key={catchItem.catch_id} className="catch-display">
                          <p>
                            <strong>{catchItem.species}</strong> - Count: {catchItem.count}
                            {catchItem.notes && ` - ${catchItem.notes}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Scenery + catch photos: served from /file (DB or MinIO) */}
                  {images[outing.outing_id] && (
                    <div className="outing-images">
                      {images[outing.outing_id].scenery && images[outing.outing_id].scenery.length > 0 && (
                        <div className="image-section">
                          <h4>Scenery Photos</h4>
                          <div className="image-grid">
                            {images[outing.outing_id].scenery.map(img => (
                              <div key={img.image_id} className="image-item">
                                {img.image_url ? (
                                  <img src={img.image_url} alt={img.caption || 'Scenery'} />
                                ) : (
                                  <img
                                    src={`${API_BASE}/scenery_images/image/${img.image_id}/file`}
                                    alt={img.caption || 'Scenery'}
                                    className="catch-photo-img"
                                  />
                                )}
                                {img.caption && <p className="image-caption">{img.caption}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {images[outing.outing_id].catches && images[outing.outing_id].catches.length > 0 && (
                        <div className="image-section">
                          <h4>Catch Photos</h4>
                          <div className="image-grid">
                            {images[outing.outing_id].catches.map(img => (
                              <div key={img.image_id} className="image-item">
                                {img.image_url ? (
                                  <img src={img.image_url} alt={img.caption || 'Catch'} />
                                ) : (
                                  <img
                                    src={`${API_BASE}/catch_images/image/${img.image_id}/file`}
                                    alt={img.caption || 'Catch'}
                                    className="catch-photo-img"
                                  />
                                )}
                                {img.caption && <p className="image-caption">{img.caption}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* --------------- ImageUploadPopup (sub-component) --------------- */
function ImageUploadPopup({ onClose, catchIndex, catchId, catchLocalId, onSavePending }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState('')

  const isPendingMode = !catchId && onSavePending && catchLocalId

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(droppedFile)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleUpload = async () => {
    if (!file) {
      alert('Please select an image file')
      return
    }

    if (isPendingMode) {
      onSavePending(catchLocalId, file, caption)
      onClose()
      return
    }

    if (!catchId) {
      onClose()
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('catch_id', catchId)
      if (caption) formData.append('caption', caption)

      await axios.post(`${API_BASE}/catch_images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      alert('Image uploaded successfully!')
      onClose()
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Failed to upload image: ' + (error.response?.data?.error || error.message))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Popup onClose={onClose}>
      <div className="image-upload-popup">
        <img src="/media/rotate2.gif" alt="Upload" className="upload-gif" />
        <h3>{isPendingMode ? 'Add photo (saved with outing)' : 'Upload Image'}</h3>
        <div
          className="drop-zone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {preview ? (
            <img src={preview} alt="Preview" className="preview-image" />
          ) : (
        <div className="drop-zone-content">
          <p>Drag & drop or click to browse</p>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="file-input"
            id="file-input"
          />
          <label htmlFor="file-input" className="browse-button">
            Browse Local Files
          </label>
        </div>
          )}
        </div>
        {file && (
          <>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Caption (optional)</label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Image caption..."
                style={{ fontSize: '0.5rem', padding: '0.5rem' }}
              />
            </div>
            <button onClick={handleUpload} disabled={uploading} className="upload-button">
              {uploading ? 'Uploading...' : isPendingMode ? 'Add photo' : 'Upload'}
            </button>
          </>
        )}
      </div>
    </Popup>
  )
}

/* --------------- Export --------------- */
export default OutingView
