import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Loading from "../../../hostdashboard/Loading";
import FetchPropertyById from "../services/fetchPropertyById";
import "../../../../styles/sass/features/booking-engine/listingDetails.scss";
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
                setError("Something went wrong while fetching the requested data, please try again later.")
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
                    <PropertyContainer property={property} />
                    <BookingContainer property={property} />
                </div>
            </div>
        );
    }
};

export default ListingDetails2;
