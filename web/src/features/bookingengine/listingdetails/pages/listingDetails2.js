import React, {useEffect, useState} from "react";
import {useLocation} from "react-router-dom";
import Loading from "../../../hostdashboard/Loading";
import FetchPropertyById from "../services/fetchPropertyById";
import fetchHostInfo from "../services/fetchHostInfo";
import "../../../../styles/sass/booking-engine/listingDetails.scss";
import Header from "../components/header";
import PropertyContainer from "../views/propertyContainer";
import BookingContainer from "../views/bookingContainer";

const ListingDetails2 = () => {
    const {search} = useLocation();
    const searchParams = new URLSearchParams(search);
    const id = searchParams.get("ID");
    const [property, setProperty] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hostId, setHostId] = useState(null);
    const [host, setHost] = useState(null);
    const [hostEmail, setHostEmail] = useState(null);


    useEffect(() => {
        setError(null);
        setProperty({});

        const loadData = async () => {
            try {
                const fetchedProperty = await FetchPropertyById(id);
                setProperty(fetchedProperty);
                setHostId(fetchedProperty.property.hostId);

                const hostData = await fetchHostInfo(fetchedProperty.property.hostId);
                console.log("Host data in ListingDetails:", hostData);
                setHost(hostData);
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
        return <Loading/>;
    } else {
        return error ? (
            <div className="listing-details-error">
                <h2>{error}</h2>
            </div>
        ) : (
            <div className="listing-details">
                <div className="container">
                    <Header title={property.property.title}/>
                    <PropertyContainer property={property}/>
                    <BookingContainer property={property}/>
                </div>
            </div>
        );
    }
};

export default ListingDetails2;
