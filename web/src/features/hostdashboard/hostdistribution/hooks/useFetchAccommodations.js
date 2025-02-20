import {useEffect, useState} from 'react'

const useFetchAccommodations = userId => {
  const [accommodations, setAccommodations] = useState([])

  useEffect(() => {
    if (!userId) return

    const fetchAccommodations = async () => {
      try {
        const response = await fetch(
          'https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/Host-Onboarding-Production-Read-AccommodationByOwner',
          {
            method: 'POST',
            body: JSON.stringify({id: userId}),
            headers: {
              'Content-type': 'application/json; charset=UTF-8',
            },
          },
        )

        if (!response.ok) {
          throw new Error('Failed to fetch accommodations')
        }

        const data = await response.json()

        if (data.body && typeof data.body === 'string') {
          const accommodationsArray = JSON.parse(data.body)
          if (Array.isArray(accommodationsArray)) {
            setAccommodations(accommodationsArray)
          }
        }
      } catch (error) {
        console.error('Failed to fetch accommodations:', error)
      }
    }

    fetchAccommodations()
  }, [userId])

  return accommodations
}

export default useFetchAccommodations
