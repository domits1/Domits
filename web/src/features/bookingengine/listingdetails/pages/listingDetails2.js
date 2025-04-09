import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Loading from "../../../hostdashboard/Loading";
import FetchPropertyById from "../services/fetchPropertyById";
import "../../../../styles/sass/booking-engine/listingDetails.scss";
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
        setProperty(await FetchPropertyById(id));
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
    console.log(property);
    return (
      <div className="listing-details">
        <div className="container">
          <Header title={property.property.title} />
          <PropertyContainer property={property} />
          <BookingContainer property={property} />
        </div>
      </div>
    );
  }
};

export default ListingDetails2;
