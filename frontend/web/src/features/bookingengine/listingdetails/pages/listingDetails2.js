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
  const [host, setHost] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    setProperty({});

    const loadData = async () => {
      try {
        const fetchedProperty = await FetchPropertyById(id);
        setProperty(fetchedProperty);

        const hostData = await fetchHostInfo(fetchedProperty?.property?.hostId);
        setHost(hostData);

        setLoading(false);
      } catch (err) {
        setError("Something went wrong while fetching the requested data, please try again later.");
        console.error(err);
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="listing-details-error">
        <h2>{error}</h2>
      </div>
    );
  }

  return (
    <div className="listing-details">
      <Header title={property?.property?.title} />

      <div className="container">
        <PropertyContainer property={property} />

        {/* IMPORTANT CHANGE: pass host into BookingContainer */}
        <BookingContainer property={property} host={host} />
      </div>
    </div>
  );
};

export default ListingDetails2;
