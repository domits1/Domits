import decodeDateNumber from "./decodeDateNumber";

/**
 * this function returns the class name of the day, this is used to style the day
 *
 * @param {number} date the date has a (year month day structure) e.g. 20250112 is 2025 Jan 12
 * @param {[number,number]} currentDate this is the current selected month and year month is stored as 0-11
 * @returns {string}
 */
function getDayClassName(date, currentDate,selectedDates,selectedDate) {
    let dayClass = "";
    let dateDecode = decodeDateNumber(date);
    if (dateDecode[1] != currentDate[0]) {
        dayClass += "other-month";
    }

    if (date == selectedDate) {
        dayClass += " day-selected";
    }

    for (let i = 0; i < selectedDates.length; i++) {
        let v = selectedDates[i];
        if (date >= v[0] && date <= v[1]) {
            dayClass += " day-range";
        }

        if (date == v[0]) {
            dayClass += " day-range-start";
        }

        if (date == v[1]) {
            dayClass += " day-range-end";
        }
    }

    return dayClass;
}

export default getDayClassName