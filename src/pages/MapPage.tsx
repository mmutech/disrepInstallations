import React, { useEffect, useRef, useState } from 'react'
import '../styles/Map.css'
import apiClient from '../config/axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
// Fix default marker icon paths for bundlers (Vite/webpack)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

;(L.Icon.Default as any).mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})
import { Link, useNavigate } from 'react-router-dom'

type Coord = {
  id?: string | number
  lat: number
  lon: number
  meta?: Record<string, any>
}

const MapPage: React.FC = () => {
  const [coords, setCoords] = useState<Coord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mapEl = useRef<HTMLDivElement | null>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const navigate = useNavigate()

  const extractCoord = (item: any): Coord | null => {
    if (item.latitude != null && item.longitude != null) return { id: item.id || item.meter_no, lat: Number(item.latitude), lon: Number(item.longitude), meta: item }
    if (item.lat != null && (item.lon != null || item.lng != null || item.longitude != null)) {
      const lonVal = item.lon ?? item.lng ?? item.longitude
      return { id: item.id || item.meter_no, lat: Number(item.lat), lon: Number(lonVal), meta: item }
    }
    if (item.geom && Array.isArray(item.geom.coordinates)) {
      const [x, y] = item.geom.coordinates
      return { id: item.id || item.meter_no, lat: Number(y), lon: Number(x), meta: item }
    }
    if (item.location && (item.location.lat != null || item.location.latitude != null)) {
      const lat = item.location.lat ?? item.location.latitude
      const lon = item.location.lng ?? item.location.lon ?? item.location.longitude
      if (lat != null && lon != null) return { id: item.id || item.meter_no, lat: Number(lat), lon: Number(lon), meta: item }
    }
    if (Array.isArray(item.coordinates) && item.coordinates.length >= 2) {
      const [a, b] = item.coordinates
      if (Math.abs(a) <= 180 && Math.abs(b) <= 90) return { id: item.id || item.meter_no, lat: Number(b), lon: Number(a), meta: item }
      if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { id: item.id || item.meter_no, lat: Number(a), lon: Number(b), meta: item }
    }
    return null
  }

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const resp = await apiClient.get('/installations', { params: { page: 1, limit: 2000 } })
        const data = resp.data || resp
        const items = Array.isArray(data.installations) ? data.installations : []

        const found: Coord[] = []
        for (const it of items) {
          const c = extractCoord(it)
          if (c && !Number.isNaN(c.lat) && !Number.isNaN(c.lon)) found.push(c)
        }

        setCoords(found)
      } catch (err: any) {
        console.error('Failed to load coordinates', err)
        setError(err?.message || 'Failed to load coordinates')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!mapEl.current) return

    // Initialize map once
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapEl.current, { center: [0, 0], zoom: 2 })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance.current)
    }

    const map = mapInstance.current

    // Clear existing markers
    map.eachLayer((layer: L.Layer) => {
      // Keep tile layer (has getTileUrl)
      // @ts-ignore
      if ((layer as any).getTileUrl) return
      map.removeLayer(layer)
    })

    if (coords.length) {
      const group: L.Marker[] = []
      coords.forEach((c) => {
        const m = L.marker([c.lat, c.lon])
        m.bindPopup(`<div><strong>${c.id ?? ''}</strong><br/>${c.lat}, ${c.lon}</div>`)
        m.addTo(map)
        group.push(m)
      })

      const groupLayer = L.featureGroup(group)
      map.fitBounds(groupLayer.getBounds().pad(0.2))
    }

    return () => {
      // do not remove map instance to preserve tiles during unmount cleanup handled below
    }
  }, [coords])

  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    localStorage.removeItem('tokenExpiry')
    navigate('/login', { replace: true })
  }

  return (
    <div className="map-page">
      <div className="map-header">
        <div className="left">
          <Link to="/dashboard">← Dashboard</Link>
          <h2>Map</h2>
        </div>
        <div className="map-actions">
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      {loading && <div style={{ padding: 12 }}>Loading coordinates...</div>}
      {error && <div style={{ color: 'red', padding: 12 }}>Error: {error}</div>}

      <div className="map-fullscreen">
        <div ref={mapEl} className="leaflet-map" />
        <div className="coords-table">
          <strong>Found coordinates:</strong> {coords.length}
          <button style={{ marginLeft: 8 }} onClick={() => console.log(coords)}>Log</button>
          {!loading && coords.length === 0 && (
            <div style={{ marginTop: 8, color: '#666' }}>No coordinates available to show on map.</div>
          )}
          <table style={{ width: '100%', marginTop: 8 }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Lat</th>
                <th>Lon</th>
              </tr>
            </thead>
            <tbody>
              {coords.map((c, i) => (
                <tr key={c.id ?? i}>
                  <td>{String(c.id ?? '-')}</td>
                  <td>{c.lat}</td>
                  <td>{c.lon}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default MapPage
