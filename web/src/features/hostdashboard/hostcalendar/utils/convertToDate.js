/**
 * convertToNumDate is a function that converts year, month, and day into a single date number
 *
 * @param {number} year
 * @param {number} month this month count is 1-12 so 1 is January and 12 is December
 * @param {number} day
 * @returns {number} the return has a (year month day structure) e.g. 20250112 is 2025 Jan 12
 */
function convertToNumDate(year, month, day) {
    return Number(
        `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`,
    );
}

export default convertToNumDate;