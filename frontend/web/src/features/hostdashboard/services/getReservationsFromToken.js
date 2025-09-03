const getReservationsFromToken = async (token) => {
    try {
        const response = await fetch(
            `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=hostId`,
            {
                headers: {
                    "Authorization": token
                }
            }
        );
    
        const data = await response.json();
        if (!response.ok){
            return "Data not found";
        }
        return data;
    } catch (error) {
		console.log(error);
        throw new Error("Exception occured getting bookings. Have you tried booking a acommodation? ", error);
    }

}

export default getReservationsFromToken;