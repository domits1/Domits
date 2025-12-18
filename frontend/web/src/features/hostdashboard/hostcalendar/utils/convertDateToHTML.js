import decodeDateNumber from "./decodeDateNumber";
import getMonthName from "./getMonthName";
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