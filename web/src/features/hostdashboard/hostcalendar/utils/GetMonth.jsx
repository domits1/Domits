/**
 * this function return month string from given int
 * 
 * @param {number} monthNumber number must be from 0 to 11
 * @returns {string}
 */
export default function getMonthName(monthNumber) {
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return months[monthNumber];
}