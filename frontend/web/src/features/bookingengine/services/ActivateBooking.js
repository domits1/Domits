const ActivateBooking = async (paymentID) => {
    const body = {
        paymentid: paymentID
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
        console.error("A unexpected error occured attempting to activate the booking.", response);
    }
}

export default ActivateBooking;