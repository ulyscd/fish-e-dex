import { useState, useEffect } from 'react'
import axios from 'axios'
import Popup from './Popup'
import './LocationView.css'

/* --------------- Constants --------------- */
const API_BASE = '/api'

/* --------------- LocationView (main) --------------- */
function LocationView({ onBack }) {
  const [activeTab, setActiveTab] = useState('log') // 'log' or 'browse'
  const [formData, setFormData] = useState({
    location_name: '',
    region: '',
    pinpoint: '',
    is_secret: false,
    lore: ''
  })
  const [showSuccess, setShowSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await axios.post(`${API_BASE}/location`, formData)
      setShowSuccess(true)
      setFormData({
        location_name: '',
        region: '',
        pinpoint: '',
        is_secret: false,
        lore: ''
      })
    } catch (error) {
      console.error('Error creating location:', error)
      alert('Failed to create location: ' + (error.response?.data?.error || error.message))
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

  return (
    <div className="location-view">
      {/* Header: back to main menu + "Locations" title */}
      <div className="view-header">
        <button className="back-button" onClick={onBack}>
          <img src="/media/bluearth.gif" alt="Back" className="back-gif" />
        </button>
        <h2>Locations</h2>
      </div>

      {/* Tabs: Log (new spot form) vs Browse (list/edit/delete) */}
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
        <form className="location-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Location Name *</label>
          <input
            type="text"
            name="location_name"
            value={formData.location_name}
            onChange={handleChange}
            required
            placeholder="Bunch Bar"
          />
        </div>

        <div className="form-group">
          <label>Region</label>
          <input
            type="text"
            name="region"
            value={formData.region}
            onChange={handleChange}
            placeholder="Elkton, OR"
          />
        </div>

        {/* Coordinates stored for weather; user pastes from Maps */}
        <div className="form-group">
          <label>Coordinates (lat,lng)</label>
          <input
            type="text"
            name="pinpoint"
            value={formData.pinpoint}
            onChange={handleChange}
            placeholder="e.g. 45.5231,-122.6765"
          />
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              name="is_secret"
              checked={formData.is_secret}
              onChange={handleChange}
            />
            Secret Spot
          </label>
        </div>

        <div className="form-group">
          <label>Lore / Description</label>
          <textarea
            name="lore"
            value={formData.lore}
            onChange={handleChange}
            rows="4"
            placeholder="Chrome come in heavy start of Nov..."
          />
        </div>

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Saving...' : 'Save Location'}
        </button>
      </form>
      )}

      {activeTab === 'browse' && (
        <LocationBrowser />
      )}

      {/* Success overlay: kakashi gif + "Location saved!" */}
      {showSuccess && (
        <Popup onClose={() => setShowSuccess(false)}>
          <img src="/media/kakashifish.gif" alt="Success" className="success-gif" />
          <p>Location saved!</p>
        </Popup>
      )}
    </div>
  )
}

/* --------------- LocationBrowser (sub-component) --------------- */
function LocationBrowser() {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editFormData, setEditFormData] = useState(null)

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API_BASE}/locations`)
      setLocations(response.data)
    } catch (error) {
      console.error('Error fetching locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this location?')) return
    
    try {
      await axios.delete(`${API_BASE}/locations/${id}`)
      fetchLocations()
    } catch (error) {
      console.error('Error deleting location:', error)
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to delete location'
      console.error('Error details:', error.response?.data)
      alert(`Failed to delete location: ${errorMessage}`)
    }
  }

  const handleEdit = (location) => {
    setEditingId(location.location_id)
    setEditFormData({
      location_name: location.location_name,
      region: location.region || '',
      pinpoint: location.pinpoint || '',
      is_secret: location.is_secret || false,
      lore: location.lore || ''
    })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.put(`${API_BASE}/locations/${editingId}`, editFormData)
      setEditingId(null)
      setEditFormData(null)
      fetchLocations()
    } catch (error) {
      console.error('Error updating location:', error)
      alert('Failed to update location')
    }
  }

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  if (loading) {
    return <div className="loading">Loading locations...</div>
  }

  return (
    <div className="location-browser">
      {locations.length === 0 ? (
        <div className="no-data">No locations found</div>
      ) : (
        <div className="location-list">
          {locations.map(location => (
            <div key={location.location_id} className="location-item">
              {/* Inline edit: same card flips to form with Save/Cancel */}
              {editingId === location.location_id ? (
                <form className="edit-form" onSubmit={handleEditSubmit}>
                  <div className="form-group">
                    <label>Location Name *</label>
                    <input
                      type="text"
                      name="location_name"
                      value={editFormData.location_name}
                      onChange={handleEditChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Region</label>
                    <input
                      type="text"
                      name="region"
                      value={editFormData.region}
                      onChange={handleEditChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Coordinates (lat,lng)</label>
                    <input
                      type="text"
                      name="pinpoint"
                      value={editFormData.pinpoint}
                      onChange={handleEditChange}
                      placeholder="e.g. 45.5231,-122.6765"
                    />
                  </div>
                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        name="is_secret"
                        checked={editFormData.is_secret}
                        onChange={handleEditChange}
                      />
                      Secret Spot
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Lore</label>
                    <textarea
                      name="lore"
                      value={editFormData.lore}
                      onChange={handleEditChange}
                      rows="3"
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
                  <div className="location-item-header">
                    <h3>{location.location_name}</h3>
                    <div className="location-item-actions">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleEdit(location)
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
                          handleDelete(location.location_id)
                        }}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="location-item-details">
                    {location.region && <p><strong>Region:</strong> {location.region}</p>}
                    {location.pinpoint && <p><strong>Coordinates:</strong> {location.pinpoint}</p>}
                    {location.is_secret && <p><strong>Secret Spot:</strong> Yes</p>}
                    {location.lore && <p><strong>Lore:</strong> {location.lore}</p>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* --------------- Export --------------- */
export default LocationView
