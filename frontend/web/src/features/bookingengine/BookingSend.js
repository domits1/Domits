import {     } from "lodash";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { getAccessToken } from "../../services/getAccessToken";

const BookingSend = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [accommodationTitle, setAccommodationTitle] = useState("");
    const [error, setError] = useState(null);
    const authToken = getAccessToken();

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);

        // The following values are currently not used for the payload: ownerId, price, cleaningFee,ServiceFee and
        // accommodationTitle. These will likely be removed but for now left incase needed for other operations.
        const accommodationId = queryParams.get("accommodationId");
        const rawAccommodationTitle = queryParams.get("accommodationTitle");
        const state = queryParams.get("State");
        const price = queryParams.get("price");
        const startDate = queryParams.get("startDate");
        const endDate = queryParams.get("endDate");
        const cleaningFee = queryParams.get("cleaningFee");
        const amountOfGuest = queryParams.get("amountOfGuest");
        const taxes = queryParams.get("taxes");
        const ServiceFee = queryParams.get("ServiceFee");

        if (!accommodationId || !state || !price) {
            console.error("❌ Missing required booking fields!");
            setError("Missing required booking details.");
            return;
        }

        const decodedAccommodationTitle = rawAccommodationTitle ? decodeURIComponent(rawAccommodationTitle) : "Unknown";
        setAccommodationTitle(decodedAccommodationTitle);
        const payload = {
            body: {
                identifiers: {
                    property_Id: accommodationId,
                },
                general: {
                    guests: parseFloat(amountOfGuest),
                    latePayment: false,
                    status: state,
                    arrivalDate: parseFloat(startDate),
                    departureDate: parseFloat(endDate),
                },
            }
        };
            const storeBooking = async () => {
            try {
                const response = await fetch(
                    "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings",
                    {
                        method: "POST",
                        body: JSON.stringify(payload),
                        headers: {
                            "Authorization": authToken
                        }
                    }
                );


                if (response.ok) {
                    const data = await response.json();
                    const paymentId = data.response.paymentId;
                    navigate(`/bookingconfirmationoverview?paymentID=${paymentId}`);
                } else {
                    const errorMessage = await response.text();
                    console.error("Failed to store booking:", errorMessage);
                    setError("Failed to store booking. Please try again.");
                }
            } catch (error) {
                console.error("Error storing booking:", error);
                setError("An error occurred while storing your booking.");
            }
        };

        storeBooking();
    }, [location, navigate]);

    return (
        <div>
            <h1>Processing Payment...</h1>
            {error && <p style={{ color: "red" }}>{error}</p>}
            <p></p>
        </div>
    );
};

export default BookingSend;