import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { fetchWeatherForOuting } from '../lib/weather'
import Popup from './Popup'
import './styles/OutingView.css'

/* --------------- OutingView (main) --------------- */
function OutingView({ onBack }) {
  const { user, isFounder } = useAuth()
  const [activeTab, setActiveTab] = useState('log')
  const [locations, setLocations] = useState([])
  const [formData, setFormData] = useState({
    location_id: '',
    outing_date: new Date().toISOString().split('T')[0],
    worth_returning: false,
    field_notes: '',
    best_lure: ''
  })
  const [catches, setCatches] = useState([{ species: '', count: 1, notes: '', _localId: `catch-${Date.now()}` }])
  const [showCatches, setShowCatches] = useState(false)
  const [pendingCatchImages, setPendingCatchImages] = useState({})
  const [pendingSceneryImages, setPendingSceneryImages] = useState([]) // [{ file, caption }]
  const [showImagePopup, setShowImagePopup] = useState(false)
  const [showSceneryPopup, setShowSceneryPopup] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedCatchIndex, setSelectedCatchIndex] = useState(null)

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase.from('locations').select('*')
      if (error) throw error
      setLocations(data || [])
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  const uploadImageToStorage = async (bucket, file, path) => {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type,
      upsert: true
    })
    if (error) throw error
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      alert('Please log in to save outings.')
      return
    }
    setLoading(true)
    try {
      const { data: outingData, error: outingError } = await supabase
        .from('outings')
        .insert({
          user_id: user.id,
          location_id: formData.location_id || null,
          outing_date: formData.outing_date,
          worth_returning: formData.worth_returning,
          field_notes: formData.field_notes || null,
          best_lure: formData.best_lure || null
        })
        .select('outing_id')
        .single()
      if (outingError) throw outingError
      const outingId = outingData.outing_id

      // Scenery images (founder only)
      if (isFounder && pendingSceneryImages.length > 0) {
        for (let i = 0; i < pendingSceneryImages.length; i++) {
          const { file, caption } = pendingSceneryImages[i]
          const path = `${user.id}/${outingId}/scenery_${Date.now()}_${i}.${file.name.split('.').pop() || 'jpg'}`
          const imageUrl = await uploadImageToStorage('scenery-images', file, path)
          await supabase.from('scenery_images').insert({
            outing_id: outingId,
            image_url: imageUrl,
            image_type: file.type,
            caption: caption || null
          })
        }
      }

      // Catches + catch images
      for (const catchItem of catches) {
        if (!catchItem.species) continue
        const { data: catchData, error: catchError } = await supabase
          .from('catches')
          .insert({
            outing_id: outingId,
            species: catchItem.species,
            count: catchItem.count || 1,
            notes: catchItem.notes || null
          })
          .select('catch_id')
          .single()
        if (catchError) throw catchError
        const catchId = catchData.catch_id

        if (isFounder) {
          const pending = pendingCatchImages[catchItem._localId] || []
          for (let i = 0; i < pending.length; i++) {
            const { file, caption } = pending[i]
            const path = `${user.id}/${catchId}/catch_${Date.now()}_${i}.${file.name.split('.').pop() || 'jpg'}`
            const imageUrl = await uploadImageToStorage('catch-images', file, path)
            await supabase.from('catch_images').insert({
              catch_id: catchId,
              image_url: imageUrl,
              image_type: file.type,
              caption: caption || null
            })
          }
        }
      }

      setShowSuccess(true)
      setFormData({
        location_id: '',
        outing_date: new Date().toISOString().split('T')[0],
        worth_returning: false,
        field_notes: '',
        best_lure: ''
      })
      setCatches([{ species: '', count: 1, notes: '', _localId: `catch-${Date.now()}` }])
      setShowCatches(false)
      setPendingCatchImages({})
      setPendingSceneryImages([])
    } catch (error) {
      console.error('Error creating outing:', error)
      alert('Failed to create outing: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
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

  const saveSceneryImage = (file, caption) => {
    setPendingSceneryImages(prev => [...prev, { file, caption: caption || '' }])
  }

  const removeSceneryImage = (index) => {
    setPendingSceneryImages(prev => prev.filter((_, i) => i !== index))
  }

  const openImageUpload = (catchIndex) => {
    setSelectedCatchIndex(catchIndex)
    setShowImagePopup(true)
  }

  return (
    <div className="outing-view">
      <div className="view-header">
        <button className="back-button" onClick={onBack}>
          <img src="/media/bluearth.gif" alt="Back" className="back-gif" />
        </button>
        <h2>Outings</h2>
      </div>

      <div className="tab-container">
        <button className={`tab-button ${activeTab === 'log' ? 'active' : ''}`} onClick={() => setActiveTab('log')}>Log</button>
        <button className={`tab-button ${activeTab === 'browse' ? 'active' : ''}`} onClick={() => setActiveTab('browse')}>Browse</button>
      </div>

      {activeTab === 'log' && (
        <form className="outing-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Date *</label>
              <input type="date" name="outing_date" value={formData.outing_date} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Location *</label>
              <select name="location_id" value={formData.location_id} onChange={handleChange}>
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
              <input type="checkbox" name="worth_returning" checked={formData.worth_returning} onChange={handleChange} />
              Coming Back?
            </label>
          </div>

          <div className="form-group">
            <label>Field Notes</label>
            <textarea name="field_notes" value={formData.field_notes} onChange={handleChange} rows="3" placeholder="Gin clear today, major snag middle of the flow..." />
          </div>

          <div className="form-group">
            <label>Best Lure</label>
            <input type="text" name="best_lure" value={formData.best_lure} onChange={handleChange} placeholder="What were they biting on?" />
          </div>

          {isFounder && (
            <div className="form-group">
              <button type="button" onClick={() => setShowSceneryPopup(true)} className="scenery-button">
                🏞️ Scenery
                {pendingSceneryImages.length > 0 && <span className="pending-count"> ({pendingSceneryImages.length})</span>}
              </button>
              {pendingSceneryImages.length > 0 && (
                <div className="pending-images">
                  {pendingSceneryImages.map((_, i) => (
                    <span key={i} className="pending-thumb">
                      🏞️
                      <button type="button" onClick={() => removeSceneryImage(i)} className="remove-pending" aria-label="Remove">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {!showCatches && (
            <div className="caught-something-section">
              <button type="button" onClick={handleCaughtSomething} className="caught-something-button">🎣 I Caught Something!</button>
            </div>
          )}

          {showCatches && (
            <div className="catches-section">
              <div className="section-header">
                <h3>Catches</h3>
                <div className="section-header-actions">
                  <button type="button" onClick={addCatch} className="add-button">+ Add Catch</button>
                  <button type="button" onClick={handleNoCatches} className="no-catches-button">I didn&apos;t catch anything</button>
                </div>
              </div>

              {catches.map((catchItem, index) => (
                <div key={catchItem._localId} className="catch-item">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Species *</label>
                      <input type="text" value={catchItem.species} onChange={(e) => handleCatchChange(index, 'species', e.target.value)} placeholder="rainbow trout" required />
                    </div>
                    <div className="form-group">
                      <label>Count</label>
                      <input type="number" value={catchItem.count} onChange={(e) => handleCatchChange(index, 'count', parseInt(e.target.value) || 1)} min="1" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label> </label>
                    <input type="text" value={catchItem.notes} onChange={(e) => handleCatchChange(index, 'notes', e.target.value)} placeholder="Catch notes..." />
                  </div>
                  {isFounder && (
                    <div className="catch-actions">
                      <button type="button" onClick={() => openImageUpload(index)} className="image-button" title="Add photo">
                        📷 Add Photo
                        {(pendingCatchImages[catchItem._localId]?.length || 0) > 0 && (
                          <span className="pending-count"> ({pendingCatchImages[catchItem._localId].length})</span>
                        )}
                      </button>
                    </div>
                  )}
                  {(pendingCatchImages[catchItem._localId]?.length || 0) > 0 && (
                    <div className="pending-images">
                      {pendingCatchImages[catchItem._localId].map((item, imgIdx) => (
                        <span key={imgIdx} className="pending-thumb">
                          📷
                          <button type="button" onClick={() => removePendingImage(catchItem._localId, imgIdx)} className="remove-pending" aria-label="Remove">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => removeCatch(index)} className="remove-button">Remove catch</button>
                </div>
              ))}
            </div>
          )}

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Saving...' : 'Save Outing'}
          </button>
        </form>
      )}

      {activeTab === 'browse' && <OutingBrowser />}

      {showImagePopup && selectedCatchIndex !== null && (
        <ImageUploadPopup
          onClose={() => { setShowImagePopup(false); setSelectedCatchIndex(null) }}
          catchIndex={selectedCatchIndex}
          catchId={null}
          catchLocalId={catches[selectedCatchIndex]?._localId}
          onSavePending={savePendingImage}
          type="catch"
        />
      )}

      {showSceneryPopup && (
        <ImageUploadPopup
          onClose={() => setShowSceneryPopup(false)}
          onSaveScenery={saveSceneryImage}
          type="scenery"
        />
      )}

      {showSuccess && (
        <Popup onClose={() => setShowSuccess(false)}>
          <img src="/media/champloo.gif" alt="Success" className="success-gif" />
          <p>Outing saved!</p>
        </Popup>
      )}
    </div>
  )
}

/* --------------- OutingBrowser --------------- */
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
      const { data, error } = await supabase
        .from('outings')
        .select('*, locations(location_name, region, latitude, longitude, pinpoint)')
      if (error) throw error
      const sorted = (data || []).sort((a, b) => {
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
      const { data, error } = await supabase.from('locations').select('*')
      if (error) throw error
      setLocations(data || [])
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
    if (!catches[outingId]) {
      try {
        const [catchesRes, sceneryRes] = await Promise.all([
          supabase.from('catches').select('*').eq('outing_id', outingId),
          supabase.from('scenery_images').select('*').eq('outing_id', outingId)
        ])
        setCatches(prev => ({ ...prev, [outingId]: catchesRes.data || [] }))
        const catchItems = catchesRes.data || []
        const catchImagesPromises = catchItems.map(c => supabase.from('catch_images').select('*').eq('catch_id', c.catch_id))
        const catchImagesRes = await Promise.all(catchImagesPromises)
        const allImages = {
          scenery: sceneryRes.data || [],
          catches: catchImagesRes.flatMap(r => r.data || [])
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
      const { error } = await supabase.from('outings').delete().eq('outing_id', id)
      if (error) throw error
      fetchOutings()
      if (expandedId === id) setExpandedId(null)
    } catch (error) {
      console.error('Error deleting outing:', error)
      alert(`Failed to delete outing: ${error.message}`)
    }
  }

  const handleEdit = async (outing) => {
    try {
      const fullOuting = outing
      const loc = fullOuting.locations
      setEditingId(outing.outing_id)
      setEditFormData({
        user_id: fullOuting.user_id,
        location_id: fullOuting.location_id || '',
        outing_date: fullOuting.outing_date ? new Date(fullOuting.outing_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        worth_returning: fullOuting.worth_returning === true,
        field_notes: fullOuting.field_notes || '',
        best_lure: fullOuting.best_lure || '',
        location_pinpoint: loc?.pinpoint || ''
      })
      if (expandedId === outing.outing_id) setExpandedId(null)
    } catch (error) {
      console.error('Error fetching outing:', error)
      alert('Failed to load outing data')
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    try {
      const { location_pinpoint, ...updateData } = editFormData
      await supabase.from('outings').update(updateData).eq('outing_id', editingId)
      if (editFormData.location_id && location_pinpoint !== undefined) {
        const loc = locations.find(l => l.location_id === parseInt(editFormData.location_id, 10))
        if (loc) {
          await supabase.from('locations').update({ pinpoint: location_pinpoint }).eq('location_id', editFormData.location_id)
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
    setEditFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const fetchWeather = async (outing) => {
    setWeatherLoading(prev => ({ ...prev, [outing.outing_id]: true }))
    try {
      const loc = outing.locations
      const data = await fetchWeatherForOuting(
        outing.outing_id,
        outing.outing_date,
        loc?.latitude,
        loc?.longitude,
        loc?.pinpoint
      )
      setWeather(prev => ({ ...prev, [outing.outing_id]: data }))
    } catch (error) {
      console.error('Error fetching weather:', error)
      alert(`Failed to fetch weather: ${error.message}`)
    } finally {
      setWeatherLoading(prev => ({ ...prev, [outing.outing_id]: false }))
    }
  }

  const getLocationDisplay = (o) => {
    const loc = o.locations
    if (!loc) return null
    return `${loc.location_name || ''} ${loc.region ? `- ${loc.region}` : ''}`.trim()
  }

  if (loading) return <div className="loading">Loading outings...</div>

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
                      <input type="date" name="outing_date" value={editFormData.outing_date} onChange={handleEditChange} required />
                    </div>
                    <div className="form-group">
                      <label>Location</label>
                      <select name="location_id" value={editFormData.location_id} onChange={handleEditChange}>
                        <option value="">Select location...</option>
                        {locations.map(loc => (
                          <option key={loc.location_id} value={loc.location_id}>
                            {loc.location_name} {loc.region ? `- ${loc.region}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {editFormData.location_id && (
                    <div className="form-group">
                      <label>Coordinates (lat,lng)</label>
                      <input type="text" name="location_pinpoint" value={editFormData.location_pinpoint || ''} onChange={handleEditChange} placeholder="e.g. 45.5231,-122.6765" />
                    </div>
                  )}
                  <div className="form-group checkbox-group">
                    <label>
                      <input type="checkbox" name="worth_returning" checked={editFormData.worth_returning} onChange={handleEditChange} />
                      Worth Returning
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Field Notes</label>
                    <textarea name="field_notes" value={editFormData.field_notes} onChange={handleEditChange} rows="3" />
                  </div>
                  <div className="form-group">
                    <label>Best Lure</label>
                    <input type="text" name="best_lure" value={editFormData.best_lure} onChange={handleEditChange} />
                  </div>
                  <div className="edit-actions">
                    <button type="submit" className="save-button">Save</button>
                    <button type="button" onClick={() => { setEditingId(null); setEditFormData(null) }} className="cancel-button">Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="outing-item-header" onClick={() => handleExpand(outing.outing_id)}>
                    <div className="outing-item-main">
                      <h3>{new Date(outing.outing_date).toLocaleDateString()}</h3>
                      {getLocationDisplay(outing) && <p className="outing-location">{getLocationDisplay(outing)}</p>}
                    </div>
                    <div className="outing-item-actions">
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleEdit(outing) }} className="edit-button">Edit</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(outing.outing_id) }} className="delete-button">Delete</button>
                    </div>
                  </div>

                  {expandedId === outing.outing_id && (
                    <div className="outing-item-expanded">
                      <div className="outing-details">
                        {outing.worth_returning !== null && <p><strong>Worth Returning:</strong> {outing.worth_returning ? 'Yes' : 'No'}</p>}
                        {outing.field_notes && <p><strong>Field Notes:</strong> {outing.field_notes}</p>}
                        {outing.best_lure && <p><strong>Best Lure:</strong> {outing.best_lure}</p>}
                        <div className="weather-section">
                          <div className="weather-header">
                            <h4>Weather</h4>
                            <button type="button" onClick={() => fetchWeather(outing)} className="weather-button" disabled={weatherLoading[outing.outing_id]}>
                              {weatherLoading[outing.outing_id] ? 'Loading...' : '🌤️ Fetch Weather'}
                            </button>
                          </div>
                          {weather[outing.outing_id] && (
                            <div className="weather-data">
                              {weather[outing.outing_id].temperature != null && <p><strong>Temperature:</strong> {weather[outing.outing_id].temperature}°F</p>}
                              {(weather[outing.outing_id].temperature_max != null || weather[outing.outing_id].temperature_min != null) && (
                                <p><strong>High / Low:</strong> {weather[outing.outing_id].temperature_max != null ? `${weather[outing.outing_id].temperature_max}°` : '—'} / {weather[outing.outing_id].temperature_min != null ? `${weather[outing.outing_id].temperature_min}°` : '—'}F</p>
                              )}
                              {weather[outing.outing_id].conditions && <p><strong>Conditions:</strong> {weather[outing.outing_id].conditions}</p>}
                              {weather[outing.outing_id].humidity != null && <p><strong>Humidity:</strong> {weather[outing.outing_id].humidity}%</p>}
                              {weather[outing.outing_id].wind_speed != null && <p><strong>Wind Speed:</strong> {weather[outing.outing_id].wind_speed} mph</p>}
                              {weather[outing.outing_id].wind_direction && <p><strong>Wind Direction:</strong> {weather[outing.outing_id].wind_direction}</p>}
                              {weather[outing.outing_id].pressure != null && <p><strong>Pressure:</strong> {weather[outing.outing_id].pressure} hPa</p>}
                              {weather[outing.outing_id].precipitation != null && <p><strong>Precipitation:</strong> {weather[outing.outing_id].precipitation} in</p>}
                            </div>
                          )}
                        </div>
                      </div>

                      {catches[outing.outing_id]?.length > 0 && (
                        <div className="outing-catches">
                          <h4>Catches</h4>
                          {catches[outing.outing_id].map(c => (
                            <div key={c.catch_id} className="catch-display">
                              <p><strong>{c.species}</strong> - Count: {c.count}{c.notes && ` - ${c.notes}`}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {images[outing.outing_id] && (
                        <div className="outing-images">
                          {images[outing.outing_id].scenery?.length > 0 && (
                            <div className="image-section">
                              <h4>Scenery Photos</h4>
                              <div className="image-grid">
                                {images[outing.outing_id].scenery.map(img => (
                                  <div key={img.image_id} className="image-item">
                                    <img src={img.image_url} alt={img.caption || 'Scenery'} className="catch-photo-img" />
                                    {img.caption && <p className="image-caption">{img.caption}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {images[outing.outing_id].catches?.length > 0 && (
                            <div className="image-section">
                              <h4>Catch Photos</h4>
                              <div className="image-grid">
                                {images[outing.outing_id].catches.map(img => (
                                  <div key={img.image_id} className="image-item">
                                    <img src={img.image_url} alt={img.caption || 'Catch'} className="catch-photo-img" />
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

/* --------------- ImageUploadPopup --------------- */
function ImageUploadPopup({ onClose, catchIndex, catchId, catchLocalId, onSavePending, onSaveScenery, type }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState('')

  const isPendingMode = type === 'catch' && !catchId && onSavePending && catchLocalId
  const isSceneryMode = type === 'scenery' && onSaveScenery

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onloadend = () => setPreview(reader.result)
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile?.type.startsWith('image/')) {
      setFile(droppedFile)
      const reader = new FileReader()
      reader.onloadend = () => setPreview(reader.result)
      reader.readAsDataURL(droppedFile)
    }
  }

  const handleUpload = () => {
    if (!file) {
      alert('Please select an image file')
      return
    }
    if (isSceneryMode) {
      onSaveScenery(file, caption)
      onClose()
      return
    }
    if (isPendingMode) {
      onSavePending(catchLocalId, file, caption)
      onClose()
      return
    }
    onClose()
  }

  return (
    <Popup onClose={onClose}>
      <div className="image-upload-popup">
        <img src="/media/rotate2.gif" alt="Upload" className="upload-gif" />
        <h3>{isSceneryMode ? 'Add scenery photo' : isPendingMode ? 'Add photo (saved with outing)' : 'Upload Image'}</h3>
        <div className="drop-zone" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
          {preview ? (
            <img src={preview} alt="Preview" className="preview-image" />
          ) : (
            <div className="drop-zone-content">
              <p>Drag & drop or click to browse</p>
              <input type="file" accept="image/*" onChange={handleFileChange} className="file-input" id="file-input" />
              <label htmlFor="file-input" className="browse-button">Browse Local Files</label>
            </div>
          )}
        </div>
        {file && (
          <>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Caption (optional)</label>
              <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Image caption..." style={{ fontSize: '0.5rem', padding: '0.5rem' }} />
            </div>
            <button onClick={handleUpload} disabled={uploading} className="upload-button">
              {uploading ? '...' : isSceneryMode ? 'Add scenery' : isPendingMode ? 'Add photo' : 'Upload'}
            </button>
          </>
        )}
      </div>
    </Popup>
  )
}

export default OutingView
