/**
 * This is written by Marijn Klappe
 * 
 * If you do not understand what is happening here, do not change anything. If something needs to be adjusted, contact me via discord --@marijn3--
 */
import React, {useState} from "react";
import leftArrowSVG from './left-arrow-calender.svg';
import rightArrowSVG from './right-arrow-calender.svg';
import './Calendar.scss';

/**
 * CalendarComponent is a component that displays a calendar
 * 
 * @returns {JSX.Element}
 */
function CalendarComponent({passedProp, isNew, updateDates, componentView}) {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

    const [calenderGridObject, setGrid] = useState(getGridObject(selectedMonth,selectedYear));

    /**
     * convertToNumDate is a function that converts year, month, and day into a single date number
     * 
     * @param {number} year
     * @param {number} month this month count is 1-12 so 1 is January and 12 is December
     * @param {number} day
     * @returns {number} the return has a (year month day structure) e.g. 20250112 is 2025 Jan 12
     */
    function convertToNumDate(year, month, day){
        return Number(`${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`);
    }

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
        for (let i = prevMonthDays - prevMonthLastDay; i <= prevMonthDays; i++) {
            dateArray.push({ date: convertToNumDate(prevYear, prevMonth + 1, i), day: i });
        }
    
        // Add the days of the current month
        for (let i = 1; i <= daysInMonth; i++) {
            dateArray.push({ date: convertToNumDate(year, month + 1, i), day: i });
        }
    
        let remainingDays = 42 - dateArray.length; // This ensures that the calendar always shows 6 weeks
    
        // Add the days of the next month
        for (let i = 1; i <= remainingDays; i++) {
            dateArray.push({ date: convertToNumDate(nextYear, nextMonth + 1, i), day: i });
        }
    
        return dateArray;
    }

    /**
     * this function handles the interaction when a day is clicked, it selects a new date
     * 
     * @param {MouseEvent} e
     */
    function dayClick(e){
        e.preventDefault()
        const anchorElement = e.currentTarget
        let date = Number(anchorElement.getAttribute("dateNumber"))

        console.log(date)
    }

    /**
     * this function returns the month days as an HTML element
     * 
     * @param {number} month the month is stored here from 0-11 so 0 is January and 11 is December
     * @param {number} year
     * @returns {Element[]}
     */
    function getGridObject(month,year){
        const calDays = getCalDays(month,year)
        const tableData = []
        
        for(let i = 0; i < 6; i++){
            tableData.push(
                <tr>
                    {[...Array(7)].map((_, j) => (
                        <td><a 
                            dateNumber={calDays[i*7+j].date} 
                            onClick={dayClick}
                            href="">{calDays[i*7+j].day}</a></td>
                    ))}
                </tr>
            )
        }

        return tableData
    }

    /**
     * this function is used to convert the month number to a string so it can be placed in the HTML code
     * 
     * @param {number} month the month is stored here from 0-11 so 0 is January and 11 is December
     * @returns {string}
     */
    function getMonthName(month){
        const months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        return months[month];
    }

    /**
     * this function is called when the user clicks the nextMonth button, the Calendar is updated with the days of the next month
     * 
     * @param {MouseEvent} e
     */
    function nextMonthBtn(e){
        e.preventDefault()

        if(selectedMonth==11){
            setSelectedMonth(0)
            setSelectedYear(selectedYear + 1)
        }else{
            setSelectedMonth(selectedMonth + 1)
        }
        setGrid(getGridObject(selectedMonth,selectedYear))
    }

    /**
     * this function is called when the user clicks the previousMonth button, the Calendar is updated with the days of the previous month
     * 
     * @param {MouseEvent} e
     */
    function previusMonthBtn(e){
        e.preventDefault()

        if(selectedMonth==0){
            setSelectedMonth(11)
            setSelectedYear(selectedYear - 1)
        }else{
            setSelectedMonth(selectedMonth - 1)
        }
        setGrid(getGridObject(selectedMonth,selectedYear))
    }

    return(
        <div className="calender-container">
            <div className="calender">
                <div className="column">
                    <div className="header">
                        <h4>{getMonthName(selectedMonth)} {selectedYear}</h4>
                        <div className="btn-container">
                            <a href="" onClick={previusMonthBtn}>
                                <img src={leftArrowSVG} alt="" />
                            </a>
                            <a href="" onClick={nextMonthBtn}>
                                <img src={rightArrowSVG} alt="" />
                            </a>
                        </div>
                    </div>
                    <div className="days">
                        <div className="day-labels">
                            {['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map((day) => (
                                <div className="day-label">
                                    <span>{day}</span>
                                </div>
                            ))}
                        </div>
                        <table className="calender-days">
                            {calenderGridObject}
                        </table>
                    </div>
                </div>
                <div className="column">
                    
                </div>
            </div>
        </div>
    )
}

export default CalendarComponent;
