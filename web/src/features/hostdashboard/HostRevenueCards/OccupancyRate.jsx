import React, {useState, useEffect} from 'react'
import axios from 'axios'
import './OccupancyRate.css'
import {Auth} from 'aws-amplify'
import {PieChart, Pie, Cell, Tooltip} from 'recharts'

const OccupancyDashboard = () => {
  const [hostId, setHostId] = useState(null)
  const [occupancyData, setOccupancyData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [timeFilter, setTimeFilter] = useState('weekly')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Fetch Host ID
  const fetchHostId = async () => {
    try {
      const userInfo = await Auth.currentUserInfo() // Fetch authenticated user's info
      return userInfo.attributes.sub // Return user's unique ID
    } catch (err) {
      console.error('Error fetching Host ID:', err)
      setError('Failed to fetch Host ID.')
    }
  }

  // Fetch Occupancy Data
  const fetchOccupancyData = async () => {
    if (!hostId) return // Prevent API call if Host ID is missing

    setLoading(true)
    setError(null)

    try {
      const payload = {
        hostId,
        rangeType: timeFilter,
        ...(timeFilter === 'custom' && {startDate, endDate}), // Include dates if custom range
      }

      console.log('Sending Payload:', payload)

      const response = await axios.post(
        'https://nnppsahbzi.execute-api.eu-north-1.amazonaws.com/prod/occupancy-rate',
        payload,
        {
          headers: {'Content-Type': 'application/json'},
          withCredentials: false, // Set this to true if cookies or authentication is required
        },
      )

      console.log('API Response:', response.data)
      setOccupancyData(response.data) // Store API response data
    } catch (err) {
      console.error('Error fetching Occupancy data:', err.message || err)
      if (err.response) {
        setError(
          `API Error: ${err.response.data.error || err.response.statusText}`,
        )
      } else if (err.request) {
        setError('Network Error: Unable to reach the server.')
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch Host ID on Component Mount
  useEffect(() => {
    const initializeHostId = async () => {
      const fetchedHostId = await fetchHostId()
      if (fetchedHostId) setHostId(fetchedHostId)
    }

    initializeHostId()
  }, [])

  // Fetch data when time filter or custom date changes
  useEffect(() => {
    if (timeFilter === 'custom' && (!startDate || !endDate)) return // Skip incomplete custom range
    fetchOccupancyData()
  }, [timeFilter, startDate, endDate, hostId]) // Depend on hostId too

  return (
    <div className="or-occupancy-rate-card">
      <h3>Occupancy Rate</h3>
      <div className="occupancy-rate-card"></div>
      {/* Time Filter Selector */}
      <div className="time-filter">
        <label htmlFor="timeFilter">Time Filter:</label>
        <select
          id="timeFilter"
          value={timeFilter}
          onChange={e => setTimeFilter(e.target.value)}>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Custom Date Range Picker */}
      {timeFilter === 'custom' && (
        <div className="or-custom-date-filter">
          <div>
            <label>Start Date : </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label>End Date : </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Loading or Error States */}
      {loading && <p>Loading...</p>}
      {error && <p style={{color: 'red'}}>Error: {error}</p>}

      {/* Occupancy Rate Card */}
      {occupancyData && (
        <div className="occupancy-rate-card">
          <p>Number of Properties: {occupancyData.totalProperties}</p>
          <p>vs Last Month: {occupancyData.vsLastMonth}%</p>
          <div className="or-pie-chart-wrapper">
            <PieChart width={150} height={150}>
              <Pie
                data={[
                  {name: 'Occupied', value: occupancyData.occupancyRate},
                  {name: 'Available', value: 100 - occupancyData.occupancyRate},
                ]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={50}
                paddingAngle={5}
                labelLine={false}
                label={({cx, cy}) => (
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{fontSize: '16px', fontWeight: 'normal'}}>
                    {`${occupancyData.occupancyRate}%`}
                  </text>
                )}>
                <Cell key="cell-0" fill="#003366" />
                <Cell key="cell-1" fill="#f9f9f9" />
              </Pie>
              <Tooltip />
            </PieChart>
          </div>
        </div>
      )}
    </div>
  )
}

export default OccupancyDashboard
