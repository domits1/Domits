/**
 * Calculate the number of nights for a date range.
 * @param startDate - Start of the date range.
 * @param endDate - End of the date range.
 * @constructor
 */
const CalculateNumberOfNights = (startDate, endDate)  => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (endDate != null){
        const timeDifference = end.getTime() - start.getTime();
        return timeDifference / (1000 * 3600 * 24);
    }
    return 0;
}

export default CalculateNumberOfNights;