//This is written by Marijn Klappe
/**
 * this function is used to convert the month number to a string so it can be placed in the HTML code
 *
 * @param {number} month the month is stored here from 0-11 so 0 is January and 11 is December
 * @returns {string}
 */
function getMonthName(month) {
    const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    return months[month];
}

export default getMonthName;