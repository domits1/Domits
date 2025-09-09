const DeactivateBooking = async (paymentID) => {
    const body = {
        paymentid: paymentID,
        failedpayment : true
    };
    const response = await fetch(
        `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?paymentid=${paymentID}`, {
            method: "PATCH",
            body: JSON.stringify(body)
        }
    );

    if (response.ok){
        return response
    } else {
        console.error("Failed to cancel booking. ", response);
    }
}

export default DeactivateBooking;