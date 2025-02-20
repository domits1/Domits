export const fetchBookings = async userId => {
  try {
    const response = await fetch(
      'https://fqujcw5loe.execute-api.eu-north-1.amazonaws.com/default/retrieveBookingsDataByUserId',
      {
        method: 'POST',
        body: JSON.stringify({GuestID: userId, Status: 'Accepted'}),
        headers: {'Content-type': 'application/json; charset=UTF-8'},
      },
    )
    if (!response.ok) throw new Error('Failed to fetch')
    const data = await response.json()
    return JSON.parse(data.body) || []
  } catch (error) {
    console.error('Failed to fetch booking data:', error)
    return []
  }
}
