/**
 * Calculate the number of nights for a date range.
 * @param startDate - Start of the date range.
 * @param endDate - End of the date range.
 * @constructor
 */
const CalculateNumberOfNights = (startDate, endDate)  => {
    const start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
    const end = new Date(new Date(endDate).setHours(0, 0, 0, 0));

    if (endDate != null){
        const timeDifference = end.getTime() - start.getTime();
        return timeDifference / (1000 * 60 * 60 * 24);
    }
    return 0;
}

export default CalculateNumberOfNights;