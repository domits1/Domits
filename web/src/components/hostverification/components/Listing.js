import React from 'react'

function Listing() {
  return (
    <div className="accocard" style={{ width: "48%" }}>
            <img
              src="https://accommodation.s3.eu-north-1.amazonaws.com/images/2026b13c-b0ba-49e6-95f8-189725c41942/1c259946-234f-4d94-9b8a-162b4236da42/Image-1.jpg"
              alt="
Experience Paradise:"
            />
            <div className="accocard-content">
              <div className="accocard-title">Tropical villa with pool</div>
              <div className="accocard-price">€1400 per night</div>
              <div className="accocard-detail">
                Escape to the Caribbean gem of Curaçao and immerse yourself in a
                world of sun, sea, and vibrant culture. With its stunning
                beaches, colorful architecture, and diverse attractions, Curaçao
                offers the perfect blend of relaxation and adventure for
                travelers seeking a memorable tropical getaway.
              </div>
              <div className="accocard-specs">
                <div className="accocard-size"></div>
                <div className="accocard-size">1 Bathrooms</div>
                <div className="accocard-size">1 Bedrooms</div>
                <div className="accocard-size">2 Persons</div>
              </div>
            </div>
          </div>
  )
}

export default Listing