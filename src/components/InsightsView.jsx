import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './styles/InsightsView.css'

function InsightsView({ onBack }) {
  const [fishCaught, setFishCaught] = useState([])
  const [bestSpots, setBestSpots] = useState([])
  const [selectedSpecies, setSelectedSpecies] = useState('Rainbow Trout')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [selectedSpecies])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [fishRes, spotsRes] = await Promise.all([
        supabase.from('fish_caught').select('*'),
        supabase.rpc('bestspot_by_species', { target_species: selectedSpecies })
      ])
      setFishCaught(fishRes.data || [])
      setBestSpots(Array.isArray(spotsRes.data) ? spotsRes.data : [])
    } catch (error) {
      console.error('Error fetching insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const uniqueSpecies = [...new Set(fishCaught.map(f => f.species))]

  return (
    <div className="insights-view">
      <div className="view-header">
        <button className="back-button" onClick={onBack}>
          <img src="/media/bluearth.gif" alt="Back" className="back-gif" />
        </button>
        <h2>Data Insights</h2>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="insights-content">
          <div className="insight-section">
            <h3>Total Fish Caught by Location</h3>
            <div className="data-table">
              <div className="table-header">
                <div>Location</div>
                <div>Region</div>
                <div>Species</div>
                <div>Total</div>
              </div>
              {fishCaught.length > 0 ? (
                fishCaught.map((item, index) => (
                  <div key={index} className="table-row">
                    <div>{item.location_name}</div>
                    <div>{item.region || '-'}</div>
                    <div>{item.species}</div>
                    <div className="total">{item.total_caught}</div>
                  </div>
                ))
              ) : (
                <div className="no-data">No data available</div>
              )}
            </div>
          </div>

          <div className="insight-section">
            <h3>Best Spots by Species</h3>
            <div className="species-selector">
              <label>Species:</label>
              <select value={selectedSpecies} onChange={(e) => setSelectedSpecies(e.target.value)}>
                {uniqueSpecies.length > 0 ? (
                  uniqueSpecies.map(species => (
                    <option key={species} value={species}>{species}</option>
                  ))
                ) : (
                  <option>No species data</option>
                )}
              </select>
            </div>
            <div className="data-table">
              <div className="table-header">
                <div>Location</div>
                <div>Region</div>
                <div>Total Caught</div>
              </div>
              {bestSpots.length > 0 ? (
                bestSpots.map((spot, index) => (
                  <div key={index} className="table-row">
                    <div>{spot.location_name}</div>
                    <div>{spot.region || '-'}</div>
                    <div className="total">{spot.total_caught}</div>
                  </div>
                ))
              ) : (
                <div className="no-data">No spots found for this species</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InsightsView
