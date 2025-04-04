import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Loading from "../../../hostdashboard/Loading";
import FetchPropertyById from "../hooks/fetchPropertyById";
import "../styles/listingDetails2.css";
import Header from "../components/header";
import PropertyContainer from "../views/propertyContainer";
import BookingContainer from "../views/bookingContainer";

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
        <Header title={property.property.title} />
        <div className="container">
          <PropertyContainer property={property} />
          <BookingContainer />
        </div>
      </div>
    );
  }
};

export default ListingDetails2;
