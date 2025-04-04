import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Loading from "../../../hostdashboard/Loading";
import FetchPropertyById from "../hooks/fetchPropertyById";
import "../styles/listingDetails2.css";
import ImageGallery from "../components/imageGallery";

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
        <div className="main">
          <section className="title-section">
            <Link to="/home">
              <p className="backButton">Go Back</p>
            </Link>
            <h1 className="title">{property.property.title}</h1>
          </section>
          <div className="container">
            <div className="left-section">
              <ImageGallery property={property}/>
              <section className="rating-section">
                <span className="rating-star">★ </span>
                <span className="rating-rating">4.97</span>
              </section>
              <p className="host-name">Hosted by Huub Homer</p>
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
    );
  }
};

export default ListingDetails2;
