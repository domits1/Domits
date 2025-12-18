import convertToNumDate from "./convertToDate";
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
    if (prevMonthLastDay != 6) {
        for (let i = prevMonthDays - prevMonthLastDay; i <= prevMonthDays; i++) {
            dateArray.push({
                date: convertToNumDate(prevYear, prevMonth + 1, i),
                day: i,
            });
        }
    }
    for (let i = 1; i <= daysInMonth; i++) {
        dateArray.push({ date: convertToNumDate(year, month + 1, i), day: i });
    }

    let remainingDays = 42 - dateArray.length; 
    for (let i = 1; i <= remainingDays; i++) {
        dateArray.push({
            date: convertToNumDate(nextYear, nextMonth + 1, i),
            day: i,
        });
    }

    return dateArray;
}

export default getCalDays;