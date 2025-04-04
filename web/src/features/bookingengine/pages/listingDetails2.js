import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Loading from "../../hostdashboard/Loading";
import FetchPropertyById from "../hooks/fetchPropertyById";
import "../styles/listingDetails2.css";

const ListingDetails2 = () => {
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const id = searchParams.get("ID");
  const [property, setProperty] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        await FetchPropertyById(setProperty, id);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching accommodation data:", error);
      }
    };
    loadData();
  }, [id]);

  if (loading) {
    return <Loading />;
  } else {
    return (
      <div className="container">
        <div className="left-section">
          <h2 className="title">{property.property.title}</h2>
          <div className="image-gallery">
            <img
              className="main-image"
              src={`https://accommodation.s3.eu-north-1.amazonaws.com/${property.images[0].key}`}
              alt="Main"
            />
            <div className="small-images-container">
              {/*{property.images.map()}*/}
              <img
                className="small-image"
                src={`https://accommodation.s3.eu-north-1.amazonaws.com/${property.images[1].key}`}
                alt="Extra 1"
              />
              <img
                className="small-image"
                src={`https://accommodation.s3.eu-north-1.amazonaws.com/${property.images[2].key}`}
                alt="Extra 2"
              />
              <img
                className="small-image"
                src={`https://accommodation.s3.eu-north-1.amazonaws.com/${property.images[3].key}`}
                alt="Extra 3"
              />
            </div>
          </div>
          <p className="host-info">
            <span className="rating">★ 4.97</span> | Hosted by{" "}
            <span className="host-name">Huub Homer</span>
          </p>
          <p className="price">
            ${property.pricing.roomRate}{" "}
            <span className="price-night">/ night</span>
          </p>
          <p className="details">
            {property.generalDetails
              .map((detail) => `${detail.value} ${detail.detail}`)
              .join(" - ")}
          </p>
        </div>

        <div className="right-section">
          <h3 className="booking-title">Booking details</h3>
          <div className="date-section">
            <div>
              <p className="label">Check in</p>
              <p className="value">15 December 2023</p>
            </div>
            <span className="arrow">→</span>
            <div>
              <p className="label">Check out</p>
              <p className="value">23 December 2023</p>
            </div>
          </div>

          <div className="info-section">
            <p className="label">Guests</p>
            <p className="value">2 adults, 2 kids</p>
          </div>

          <div className="info-section">
            <p className="label">Pets</p>
            <select className="select-box">
              <option>Select</option>
              <option>No Pets</option>
              <option>1 Pet</option>
              <option>2+ Pets</option>
            </select>
          </div>

          <button className="reserve-btn">Reserve</button>
          <p className="note">*You won’t be charged yet</p>

          <div className="price-breakdown">
            <p>
              7 nights x $1400 a night <span className="amount">$9800</span>
            </p>
            <p className="discount">
              Season booking discount <span className="amount">-$75</span>
            </p>
          </div>
        </div>
      </div>
    );
  }
};

export default ListingDetails2;
