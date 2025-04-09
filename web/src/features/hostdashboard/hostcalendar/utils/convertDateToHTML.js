//This is written by Marijn Klappe
import decodeDateNumber from "./decodeDateNumber";
import getMonthName from "./getMonthName";

/**
 * this function is used to convert the date number to a HTML element for the dates column.
 *
 * @param {number} date the dates have a (year month day structure) e.g. 18890420 is 1889 Apr 20
 * @param {number} i
 * @returns {Element}
 */
function convertDateToHTML(date) {
    let decodeNumber = decodeDateNumber(date);
    let month = getMonthName(decodeNumber[1]).substring(0, 3);

    return (
        <span>
            {decodeNumber[2]} {month} {decodeNumber[0]}
        </span>
    );
}

export default convertDateToHTML