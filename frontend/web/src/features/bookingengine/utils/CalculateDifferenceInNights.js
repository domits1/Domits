function CalculateDaysBetweenDates (startDate, endDate) {
    const start = new Date(parseFloat(startDate));
    const end = new Date(parseFloat(endDate));
    const differenceInTime = end - start;
    const differenceInDays = differenceInTime / (1000 * 3600 * 24);
    return differenceInDays;
};
export default CalculateDaysBetweenDates;