/**
 * Calculate the number of nights for a date range.
 * @param startDate - Start of the date range.
 * @param endDate - End of the date range.
 * @param setNumberOfNights - Function to set the number of nights.
 * @constructor
 */
const CalculateNumberOfNights = (startDate, endDate, setNumberOfNights)  => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (endDate != null){
        const timeDifference = end.getTime() - start.getTime();
        const days = timeDifference / (1000 * 3600 * 24);
        setNumberOfNights(days);
    } else {
        setNumberOfNights(0)
    }
}

export default CalculateNumberOfNights;