import decodeDateNumber from "./decodeDateNumber";
import convertToNumDate from "./convertToDate";

/**
 * addToDate is a function that adds a specified number of days to a given date
 *
 * @param {number} date the date has a (year month day structure) e.g. 20250112 is 2025 Jan 12
 * @param {number} days the number of days to add to the date
 * @returns {number} the new date after adding the specified number of days, in the same (year month day structure)
 */
function addToDate(date, days) {
    let decodedDate = decodeDateNumber(date);
    date = new Date(decodedDate[0], decodedDate[1], decodedDate[2]);
    date.setDate(date.getDate() + days);
    return convertToNumDate(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
    );
}

export default addToDate