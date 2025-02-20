export const fetchAccommodationsByOwnerId = async userId => {
  try {
    const response = await fetch(
      'https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/Host-Onboarding-Production-Read-AccommodationByOwner',
      {
        method: 'POST',
        body: JSON.stringify({id: userId}),
        headers: {'Content-type': 'application/json; charset=UTF-8'},
      },
    )
    if (!response.ok) throw new Error('Failed to fetch')
    const data = await response.json()
    return JSON.parse(data.body) || []
  } catch (error) {
    console.error('Failed to fetch accommodations:', error)
    return []
  }
}
