import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

const PaymentConfirm = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [accommodationTitle, setAccommodationTitle] = useState("");
    const [error, setError] = useState(null);

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);

        const paymentID = queryParams.get("paymentID") || uuidv4(); 
        const userId = queryParams.get("userId");
        const accommodationId = queryParams.get("accommodationId");
        const rawAccommodationTitle = queryParams.get("accommodationTitle");
        const ownerId = queryParams.get("ownerId");
        const State = queryParams.get("State");
        const price = queryParams.get("price");
        const startDate = queryParams.get("startDate");
        const endDate = queryParams.get("endDate");
        const cleaningFee = queryParams.get("cleaningFee");
        const amountOfGuest = queryParams.get("amountOfGuest");
        const taxes = queryParams.get("taxes");

        console.log("🔍 Extracted Query Params:", {
            paymentID,
            userId,
            accommodationId,
            rawAccommodationTitle,
            ownerId,
            State,
            price,
            startDate,
            endDate,
            cleaningFee,
            amountOfGuest,
            taxes
        });

        if (!userId || !accommodationId || !ownerId || !State || !price) {
            console.error("❌ Missing required booking fields!");
            setError("Missing required booking details.");
            return;
        }

        const decodedAccommodationTitle = rawAccommodationTitle ? decodeURIComponent(rawAccommodationTitle) : "Unknown";
        setAccommodationTitle(decodedAccommodationTitle);

        const payload = {
            ID: paymentID,  
            paymentID, 
            userId,
            accommodationId,
            accommodationTitle: decodedAccommodationTitle,
            ownerId,
            State,
            price,
            startDate,
            endDate,
            cleaningFee,
            amountOfGuest,
            taxes
        };

        console.log("📤 Booking Payload Ready:", JSON.stringify(payload, null, 2));

        const storeBooking = async () => {
            try {
                const response = await fetch(
                    "https://enpt37588f.execute-api.eu-north-1.amazonaws.com/default/store-booking",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    }
                );

                console.log("📡 API Response Status:", response.status);

                if (response.ok) {
                    console.log("Booking stored successfully! Redirecting...");
                    navigate(`/paymentconfirmpage?paymentID=${paymentID}`);
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
        </div>
    );
};

export default PaymentConfirm;
