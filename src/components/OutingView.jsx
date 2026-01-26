import { useState, useEffect } from 'react'
import axios from 'axios'
import Popup from './Popup'
import './OutingView.css'

const API_BASE = '/api'

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
  const [catches, setCatches] = useState([{ species: '', count: 1, notes: '' }])
  const [showCatches, setShowCatches] = useState(false)
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
      // Create outing
      const outingResponse = await axios.post(`${API_BASE}/outings`, {
        ...formData,
        location_id: formData.location_id || null
      })
      const outingId = outingResponse.data.outing_id

      // Create catches
      const catchIds = []
      for (const catchItem of catches) {
        if (catchItem.species) {
          const catchResponse = await axios.post(`${API_BASE}/catches`, {
            outing_id: outingId,
            species: catchItem.species,
            count: catchItem.count || 1,
            notes: catchItem.notes || null
          })
          catchIds.push(catchResponse.data.catch_id)
        }
      }

      setShowSuccess(true)
      // Reset form
      setFormData({
        user_id: 1,
        location_id: '',
        outing_date: new Date().toISOString().split('T')[0],
        worth_returning: false,
        field_notes: '',
        mvp_lure: ''
      })
      setCatches([{ species: '', count: 1, notes: '' }])
      setShowCatches(false)
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
    setCatches([...catches, { species: '', count: 1, notes: '' }])
  }

  const handleCaughtSomething = () => {
    setShowCatches(true)
    if (catches.length === 0) {
      setCatches([{ species: '', count: 1, notes: '' }])
    }
  }

  const removeCatch = (index) => {
    setCatches(catches.filter((_, i) => i !== index))
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
            <button type="button" onClick={addCatch} className="add-button">
              + Add Catch
            </button>
          </div>

          {catches.map((catchItem, index) => (
            <div key={index} className="catch-item">
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
                <label className="catch-notes-label">Notes</label>
                <input
                  type="text"
                  value={catchItem.notes}
                  onChange={(e) => handleCatchChange(index, 'notes', e.target.value)}
                  placeholder="Catch notes..."
                />
              </div>
              <div className="catch-actions">
                <button
                  type="button"
                  onClick={() => openImageUpload(index)}
                  className="image-button"
                  title="Note: Save outing first, then add photos to catches"
                >
                  📷 Add Photo
                </button>
                {catches.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCatch(index)}
                    className="remove-button"
                  >
                    Remove
                  </button>
                )}
              </div>
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

      {showImagePopup && (
        <ImageUploadPopup
          onClose={() => {
            setShowImagePopup(false)
            setSelectedCatchIndex(null)
          }}
          catchIndex={selectedCatchIndex}
          catchId={null} // Would need to be passed from parent after catch is created
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

function OutingBrowser() {
  const [outings, setOutings] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editFormData, setEditFormData] = useState(null)
  const [catches, setCatches] = useState({})
  const [images, setImages] = useState({})

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
      alert('Failed to delete outing')
    }
  }

  const handleEdit = async (outing) => {
    try {
      // Fetch full outing data to get all fields
      const response = await axios.get(`${API_BASE}/outings/${outing.outing_id}`)
      const fullOuting = response.data
      
      setEditingId(outing.outing_id)
      setEditFormData({
        user_id: fullOuting.user_id || 1,
        location_id: fullOuting.location_id || '',
        outing_date: fullOuting.outing_date ? new Date(fullOuting.outing_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        worth_returning: fullOuting.worth_returning === true || fullOuting.worth_returning === 1,
        field_notes: fullOuting.field_notes || '',
        mvp_lure: fullOuting.mvp_lure || ''
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
      await axios.put(`${API_BASE}/outings/${editingId}`, editFormData)
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
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(outing)
                        }}
                        className="edit-button"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
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
                  </div>

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
                                  <a
                                    href={`${API_BASE}/scenery_images/image/${img.image_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    View Image
                                  </a>
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
                                  <a
                                    href={`${API_BASE}/catch_images/image/${img.image_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    View Image
                                  </a>
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

function ImageUploadPopup({ onClose, catchIndex, catchId }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState('')

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

    if (!catchId) {
      alert('Please save the catch first before uploading images')
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
        <h3>Upload Image</h3>
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
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </>
        )}
      </div>
    </Popup>
  )
}

export default OutingView
