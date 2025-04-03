/**
 * this function is used to convert the date number to a date object
 *
 * @param {number} date the date has a (year month day structure) e.g. 20250112 is 2025 Jan 12
 * @returns {[number, number, number]} the return is a array with the year, month, and day the month is stored here from 0-11
 */
function decodeDateNumber(date) {
    const dateString = date.toString();
    const year = parseInt(dateString.slice(0, 4), 10);
    const month = parseInt(dateString.slice(4, 6), 10) - 1; // Subtract 1 to convert to 0-based month
    const day = parseInt(dateString.slice(6, 8), 10);
    return [year, month, day];
}

export default decodeDateNumber