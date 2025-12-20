import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Loading from "../../../hostdashboard/Loading";
import FetchPropertyById from "../services/fetchPropertyById";
import fetchHostInfo from "../services/fetchHostInfo";
import Header from "../components/header";
import PropertyContainer from "../views/propertyContainer";
import BookingContainer from "../views/bookingContainer";

const ListingDetails2 = () => {
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const id = searchParams.get("ID");
  const [property, setProperty] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [checkInDate, setCheckInDate] = useState(today.toISOString().split("T")[0]);
  const [checkOutDate, setCheckOutDate] = useState(tomorrow.toISOString().split("T")[0]);
  const handleDateChange = ({ start, end }) => {
    if (start) {
      setCheckInDate(start.toISOString().split("T")[0]);
    }
    if (end) {
      setCheckOutDate(end.toISOString().split("T")[0]);
    }
  };
  useEffect(() => {
    setError(null);
    setProperty({});
    const loadData = async () => {
      try {
        const fetchedProperty = await FetchPropertyById(id);
        setProperty(fetchedProperty);
        const hostData = await fetchHostInfo(fetchedProperty.property.hostId);
        setLoading(false);
      } catch (error) {
        setError("Something went wrong while fetching the requested data, please try again later.");
        console.error(error);
        setLoading(false);
      }
    };
    loadData();
  }, [id]);
  if (loading) {
    return <Loading />;
  } else {
    return error ? (
      <div className="listing-details-error">
        <h2>{error}</h2>
      </div>
    ) : (
      <div className="listing-details">
        <Header title={property.property.title} />
        <div className="container">
          <PropertyContainer
            property={property}
            onDateChange={handleDateChange}
          />

          <BookingContainer
            property={property}
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            setCheckInDate={setCheckInDate}
            setCheckOutDate={setCheckOutDate}
          />
        </div>
      </div>
    );
  }
};
export default ListingDetails2;
