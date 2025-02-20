import React, {useEffect} from 'react'

const MapComponent = ({location}) => {
  useEffect(() => {
    // Create a new map centered at the user's specified location
    const map = new window.google.maps.Map(
      document.getElementById('map-placeholder'),
      {
        center: {
          lat: parseFloat(location.latitude),
          lng: parseFloat(location.longitude),
        },
        zoom: 15, // You can adjust the zoom level as needed
      },
    )

    // Add a marker for the user's specified location
    new window.google.maps.Marker({
      position: {
        lat: parseFloat(location.latitude),
        lng: parseFloat(location.longitude),
      },
      map: map,
      title: 'Your Location',
    })
  }, [location])

  return (
    <div id="map-placeholder" style={{width: '100%', height: '400px'}}></div>
  )
}

export default MapComponent
