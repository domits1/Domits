import decodeDateNumber from "./decodeDateNumber";
import convertToNumDate from "./convertToDate";

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