//This is written by Marijn Klappe
import convertToNumDate from "./convertToDate";

/**
 * getCalDays is a function used to retrieve the day numbers of the selected month and year.
 * these days are used to fill in the calendar days
 *
 * @param {number} month the month is stored here from 0-11 so 0 is January and 11 is December
 * @param {number} year
 * @returns {{date: number, day: number}[]} the date has a (year month day structure) e.g. 20250112 is 2025 Jan 12
 */
function getCalDays(month, year) {
    const dateArray = [];

    const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
    const getDayOfWeek = (y, m, d) => (new Date(y, m, d).getDay() + 6) % 7; // 0 is Monday, 6 is Sunday

    let prevMonth = (month + 11) % 12;
    let prevYear = month === 0 ? year - 1 : year;
    let nextMonth = (month + 1) % 12;
    let nextYear = month === 11 ? year + 1 : year;

    let prevMonthDays = getDaysInMonth(prevYear, prevMonth);
    let prevMonthLastDay = getDayOfWeek(prevYear, prevMonth, prevMonthDays);
    let daysInMonth = getDaysInMonth(year, month);

    // Add the days of the previous month
    if (prevMonthLastDay != 6) {
        for (let i = prevMonthDays - prevMonthLastDay; i <= prevMonthDays; i++) {
            dateArray.push({
                date: convertToNumDate(prevYear, prevMonth + 1, i),
                day: i,
            });
        }
    }

    // Add the days of the current month
    for (let i = 1; i <= daysInMonth; i++) {
        dateArray.push({ date: convertToNumDate(year, month + 1, i), day: i });
    }

    let remainingDays = 42 - dateArray.length; // This ensures that the calendar always shows 6 weeks

    // Add the days of the next month
    for (let i = 1; i <= remainingDays; i++) {
        dateArray.push({
            date: convertToNumDate(nextYear, nextMonth + 1, i),
            day: i,
        });
    }

    return dateArray;
}

export default getCalDays;