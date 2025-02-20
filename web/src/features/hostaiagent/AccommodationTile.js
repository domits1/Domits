import React from 'react'
import Slider from 'react-slick'

const AccommodationTile = ({accommodation}) => {
  console.log('Accommodation data:', accommodation)
  const images = Object.values(accommodation.images)

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
  }

  const accommodationUrl = `/listingdetails?ID=${accommodation.id}`

  console.log('Generated Accommodation URL:', accommodationUrl) // Debugging

  return (
    <div className="hostchatbot-accommodation-tile">
      {/* Stop event bubbling */}
      <a
        href={accommodationUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()} // Prevent interference from parent events
      >
        <Slider {...sliderSettings}>
          {images.map((image, index) => (
            <div key={index}>
              <img
                src={image || 'default-image.jpg'}
                alt={`Accommodation ${index + 1}`}
                className="hostchatbot-accommodation-image"
                onError={e => (e.target.src = 'default-image.jpg')}
              />
            </div>
          ))}
        </Slider>
      </a>
      <div className="hostchatbot-accommodation-details">
        <h3>{accommodation.title || 'Accommodation'}</h3>
        <p>
          <strong>City:</strong> {accommodation.city}
        </p>
        <p>
          <strong>Bathrooms:</strong>{' '}
          {accommodation.bathrooms > 0
            ? accommodation.bathrooms
            : 'No bathrooms available'}
        </p>
        <p>
          <strong>Guest Amount:</strong>{' '}
          {accommodation.guestAmount > 0
            ? accommodation.guestAmount
            : 'No guests allowed'}
        </p>
      </div>
    </div>
  )
}

export default AccommodationTile
