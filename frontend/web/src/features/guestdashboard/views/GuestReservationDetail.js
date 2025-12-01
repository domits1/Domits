import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CalendarTodayOutlined from "@mui/icons-material/CalendarTodayOutlined";
import PeopleAltOutlined from "@mui/icons-material/PeopleAltOutlined";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import AttachMoneyOutlined from "@mui/icons-material/AttachMoneyOutlined";
import CleaningServicesOutlined from "@mui/icons-material/CleaningServicesOutlined";
import RoomServiceOutlined from "@mui/icons-material/RoomServiceOutlined";
import { getPropertyDetails } from "../services/bookingAPI";
import dateFormatterDD_MM_YYYY from "../../../utils/DateFormatterDD_MM_YYYY";
import { timestampToDate } from "../../../utils/timestampToDate";

const S3_URL = "https://accommodation.s3.eu-north-1.amazonaws.com/";
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><rect width='100%' height='100%' fill='%23eee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-family='Arial' font-size='20'>No image</text></svg>";
const DEFAULT_SERVICE_FEE_RATE = 0.15;

const normalizeImageUrl = (maybeKeyOrUrl) => {
  if (!maybeKeyOrUrl) return PLACEHOLDER_IMAGE;
  const val = String(maybeKeyOrUrl);
  if (val.startsWith("http")) return val;
  return `${S3_URL}${val.replace(/^\/+/, "")}`;
};

const GuestReservationDetail = ({ booking, onBack }) => {
  const navigate = useNavigate();
  const [propertyDetails, setPropertyDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getPropertyId = useCallback(
    () => booking?.property_id ?? booking?.propertyId ?? booking?.PropertyID ?? null,
    [booking]
  );

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      const propertyId = getPropertyId();
      if (!propertyId) {
        setLoading(false);
        return;
      }

      try {
        const details = await getPropertyDetails(propertyId);
        setPropertyDetails(details);
      } catch (err) {
        console.error("Error fetching property details:", err);
        setError("Could not load property details.");
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyDetails();
  }, [getPropertyId]);

  if (!booking) {
    return (
      <div className="guest-reservation-detail">
        <div className="guest-reservation-detail__error">No booking selected.</div>
      </div>
    );
  }

  const arrivalDate = timestampToDate(booking?.arrivaldate ?? booking?.arrival_date ?? booking?.arrivalDate);
  const departureDate = timestampToDate(booking?.departuredate ?? booking?.departure_date ?? booking?.departureDate);
  const createdAt = timestampToDate(booking?.createdat ?? booking?.created_at ?? booking?.createdAt);

  const status = String(booking?.status ?? booking?.Status ?? "").toLowerCase();
  const guests = booking?.guests ?? booking?.Guests ?? 1;

  const property = propertyDetails?.property || {};
  const pricing = propertyDetails?.pricing || {};
  const location = propertyDetails?.location || {};
  const images = propertyDetails?.images || [];

  const title = property?.title || booking?.title || booking?.Title || "Accommodation";
  const city = location?.city || booking?.city || "Unknown city";
  const country = location?.country || booking?.country || "";
  const address = location?.street
    ? `${location.street}, ${city}${country ? ", " + country : ""}`
    : `${city}${country ? ", " + country : ""}`;

  const coverImage = normalizeImageUrl(images[0]?.key);

  const calculateNights = () => {
    if (!arrivalDate || !departureDate) return 0;
    const arrival = new Date(arrivalDate);
    const departure = new Date(departureDate);
    const diffTime = Math.abs(departure - arrival);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const nights = calculateNights();
  const roomRate = pricing?.roomRate || 0;
  const cleaningFee = pricing?.cleaning || 0;
  const serviceFee = pricing?.service || roomRate * DEFAULT_SERVICE_FEE_RATE;
  const totalPrice = roomRate * nights + cleaningFee + serviceFee;

  const getStatusDisplay = () => {
    switch (status) {
      case "paid":
        return { label: "Confirmed", color: "#4CAF50" };
      case "awaiting payment":
        return { label: "Awaiting Payment", color: "#ff9800" };
      case "failed":
        return { label: "Failed", color: "#f44336" };
      case "cancelled":
        return { label: "Cancelled", color: "#9e9e9e" };
      default:
        return { label: status || "Pending", color: "#2196F3" };
    }
  };

  const statusDisplay = getStatusDisplay();

  const handleViewProperty = () => {
    const propertyId = getPropertyId();
    if (propertyId) {
      navigate(`/listingdetails?ID=${encodeURIComponent(propertyId)}`);
    }
  };

  return (
    <div className="guest-reservation-detail">
      <div className="guest-reservation-detail__header">
        <button className="guest-reservation-detail__back-btn" onClick={onBack} aria-label="Go back to bookings">
          <ArrowBackOutlined />
          <span>Back to Bookings</span>
        </button>
        <h2 className="guest-reservation-detail__title">Reservation Details</h2>
      </div>

      {loading ? (
        <div className="guest-reservation-detail__loading">Loading reservation details...</div>
      ) : error ? (
        <div className="guest-reservation-detail__error" role="alert">
          {error}
        </div>
      ) : (
        <div className="guest-reservation-detail__content">
          <div className="guest-reservation-detail__main">
            <section className="guest-reservation-detail__property-card">
              <div className="guest-reservation-detail__property-image">
                <img
                  src={coverImage}
                  alt={title}
                  onError={(e) => {
                    e.currentTarget.src = PLACEHOLDER_IMAGE;
                  }}
                />
              </div>
              <div className="guest-reservation-detail__property-info">
                <h3 className="guest-reservation-detail__property-title">{title}</h3>
                <p className="guest-reservation-detail__property-location">
                  <LocationOnOutlined fontSize="small" />
                  {address}
                </p>
                <button className="guest-reservation-detail__view-property-btn" onClick={handleViewProperty}>
                  <HomeOutlined fontSize="small" />
                  View Property
                </button>
              </div>
            </section>

            <section className="guest-reservation-detail__status-card">
              <div className="guest-reservation-detail__status-badge" style={{ backgroundColor: statusDisplay.color }}>
                <CheckCircleOutlined fontSize="small" />
                <span>{statusDisplay.label}</span>
              </div>
              {createdAt && (
                <p className="guest-reservation-detail__booked-on">Booked on {dateFormatterDD_MM_YYYY(createdAt)}</p>
              )}
            </section>

            <section className="guest-reservation-detail__dates-card">
              <h4 className="guest-reservation-detail__section-title">
                <CalendarTodayOutlined fontSize="small" />
                Stay Details
              </h4>
              <div className="guest-reservation-detail__dates-grid">
                <div className="guest-reservation-detail__date-item">
                  <span className="guest-reservation-detail__date-label">Check-in</span>
                  <span className="guest-reservation-detail__date-value">
                    {arrivalDate ? dateFormatterDD_MM_YYYY(arrivalDate) : "Not specified"}
                  </span>
                </div>
                <div className="guest-reservation-detail__date-item">
                  <span className="guest-reservation-detail__date-label">Check-out</span>
                  <span className="guest-reservation-detail__date-value">
                    {departureDate ? dateFormatterDD_MM_YYYY(departureDate) : "Not specified"}
                  </span>
                </div>
                <div className="guest-reservation-detail__date-item">
                  <span className="guest-reservation-detail__date-label">Nights</span>
                  <span className="guest-reservation-detail__date-value">
                    {nights} {nights === 1 ? "night" : "nights"}
                  </span>
                </div>
                <div className="guest-reservation-detail__date-item">
                  <span className="guest-reservation-detail__date-label">
                    <PeopleAltOutlined fontSize="small" /> Guests
                  </span>
                  <span className="guest-reservation-detail__date-value">
                    {guests} {guests === 1 ? "guest" : "guests"}
                  </span>
                </div>
              </div>
            </section>

            {images.length > 1 && (
              <section className="guest-reservation-detail__gallery">
                <h4 className="guest-reservation-detail__section-title">Property Photos</h4>
                <div className="guest-reservation-detail__gallery-grid">
                  {images.slice(0, 4).map((img, index) => (
                    <div key={img.key || index} className="guest-reservation-detail__gallery-item">
                      <img
                        src={normalizeImageUrl(img.key)}
                        alt={`${title} - Photo ${index + 1}`}
                        onError={(e) => {
                          e.currentTarget.src = PLACEHOLDER_IMAGE;
                        }}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="guest-reservation-detail__sidebar">
            <section className="guest-reservation-detail__price-card">
              <h4 className="guest-reservation-detail__section-title">Price Details</h4>
              <div className="guest-reservation-detail__price-breakdown">
                <div className="guest-reservation-detail__price-row">
                  <span>
                    <AttachMoneyOutlined fontSize="small" />
                    Room rate ({nights} {nights === 1 ? "night" : "nights"})
                  </span>
                  <span>€ {(roomRate * nights).toFixed(2)}</span>
                </div>
                <div className="guest-reservation-detail__price-row">
                  <span>
                    <CleaningServicesOutlined fontSize="small" />
                    Cleaning fee
                  </span>
                  <span>€ {cleaningFee.toFixed(2)}</span>
                </div>
                <div className="guest-reservation-detail__price-row">
                  <span>
                    <RoomServiceOutlined fontSize="small" />
                    Service fee
                  </span>
                  <span>€ {serviceFee.toFixed(2)}</span>
                </div>
              </div>
              <div className="guest-reservation-detail__price-total">
                <span>Total</span>
                <span>€ {totalPrice.toFixed(2)}</span>
              </div>
            </section>

            <section className="guest-reservation-detail__booking-id">
              <h4 className="guest-reservation-detail__section-title">Booking Reference</h4>
              <p className="guest-reservation-detail__booking-id-value">
                {booking?.id || booking?.ID || booking?.payment_id || "N/A"}
              </p>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
};

export default GuestReservationDetail;
