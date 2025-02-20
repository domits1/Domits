import {useEffect, useState} from 'react'
import {fetchBookings} from '../services/fetchBookingsService.js'

const useFetchBookings = userId => {
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    if (!userId) return
    const loadBookings = async () => {
      const bookingData = await fetchBookings(userId)
      setBookings(bookingData)
    }
    loadBookings()
  }, [userId])

  return bookings
}

export default useFetchBookings
