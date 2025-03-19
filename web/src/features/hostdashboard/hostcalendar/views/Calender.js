/**
 * This is written by Marijn Klappe
 * 
 * If you do not understand what is happening here, do not change anything. If something needs to be adjusted, contact me via discord --@marijn3--
 */
import React, {useState} from "react";
import leftArrowSVG from './left-arrow.svg';
import rightArrowSVG from './right-arrow.svg';
import trashSVG from './trash.svg';
import './../styles/Calender.scss';

let selectedDate = null
let selectedDates = []
let selectedMonth = new Date().getMonth()
let selectedYear = new Date().getFullYear()
let editMode = false

/**
 * this is a list of all the functions that are used in the CalendarComponent
 * 
 * convertDatesToDBDates
 * convertToNumDate
 * getCalDays
 * addToDate
 * sortDates
 * deleteDate
 * newDate
 * dayClick
 * decodeDateNumber
 * getDayClassName
 * convertDateToHTML
 * deleteDateBtn
 * getDatesObject
 * getGridObject
 * getMonthName
 * nextMonthBtn
 * previusMonthBtn
 * switchBtn
 */

/**
 * CalendarComponent is a component that displays a calendar
 * 
 * @returns {JSX.Element}
 */
function CalendarComponent({passedProp, isNew, updateDates, componentView}) {
    const [selectedMonthState, setSelectedMonth] = useState(selectedMonth);
    const [selectedYearState, setSelectedYear] = useState(selectedYear);
    const [calenderGridObject, setGrid] = useState(getGridObject(selectedMonth,selectedYear));
    const [datesGridObject, setDates] = useState(getDatesObject(selectedDates));
    const [editModeClass, setEditMode] = useState("switch-btn");


    /**
     * this function converts the selected dates to the datetypes in the database
     * 
     * @return {{availableStartDate:number, availableEndDate:number}[]}
     */    
    function convertDatesToDBDates()
    {
        let updatedList = []

        for(let i = 0; i < selectedDates.length(); i++){
            let newDate = []
            for(let j = 0; j < 2; j++){
                let date = selectedDates[i][j]

                const year = date.substring(0, 4);
                const month = date.substring(4, 6) - 1;
                const day = date.substring(6, 8);
    
                newDate.push(new Date(year, month, day).getTime())
            }
            updatedList.push(newDate)
        }
    }

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
        if(prevMonthLastDay != 6) {
            for (let i = prevMonthDays - prevMonthLastDay; i <= prevMonthDays; i++) {
                dateArray.push({ date: convertToNumDate(prevYear, prevMonth + 1, i), day: i });
            }
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
     * addToDate is a function that adds a specified number of days to a given date
     * 
     * @param {number} date the date has a (year month day structure) e.g. 20250112 is 2025 Jan 12
     * @param {number} days the number of days to add to the date
     * @returns {number} the new date after adding the specified number of days, in the same (year month day structure)
     */
    function addToDate(date,days){
        let decodedDate = decodeDateNumber(date)
        date = new Date(decodedDate[0],decodedDate[1],decodedDate[2]);
        date.setDate(date.getDate() + days);
        return convertToNumDate(date.getFullYear(),date.getMonth() + 1,date.getDate())
    }

    /**
     * this function sorts the dates in the selectedDates array
     * 
     */
    function sortDates() {
        selectedDates.sort((a, b) => a[0] - b[0]);
    }
    
    /**
     * deleteDate is a function that removes a date from the selectedDates
     * 
     * @param {[number, number]} date - The date range to be deleted, represented as an array of two numbers.
     */
    function deleteDate(date){
        for (let i = 0; i < selectedDates.length; i++) {
            let v = selectedDates[i];

            if (date[0] > v[0] && date[0] <= v[1] && date[1] >= v[1]){
                selectedDates[i][1] = addToDate(date[0],-1)
                continue
            }

            if (date[0] <= v[0] && date[1] >= v[0] && date[1] < v[1]){
                selectedDates[i][0] = addToDate(date[1],1)
                continue
            }

            if (date[0] <= v[0] && date[1] >= v[1]){
                selectedDates.splice(i,1);
                i--
                continue
            }

            if (date[0] > v[0] && date[1] < v[1]){
                selectedDates.push([addToDate(date[1],1),v[1]])
                selectedDates[i][1] = addToDate(date[0],-1)
                break
            }
        }

        sortDates()
    }

    /**
     * this function adds a new date to the selectedDates array it also makes shore that the dates dont overlap
     * 
     * @param {[number,number]} date 
     */
    function newDate(date){
        let addNewDate = true

        for(let _ = 0; _ < 2; _++){
            for (let i = 0; i < selectedDates.length; i++) {
                let v = selectedDates[i];

                if(date[0] >= v[0] && date[0] <= v[1] && date[1] >= v[0] && date[1] <= v[1]){
                    addNewDate = false
                    continue
                }

                if (date[0] >= v[0] && date[0] <= v[1] && date[1] > v[1]) {
                    selectedDates[i][1] = date[1]
                    date[0] = selectedDates[i][0]
                    addNewDate = false
                    continue
                }

                if (date[1] >= v[0] && date[1] <= v[1] && date[0] < v[0]) {
                    selectedDates[i][0] = date[0]
                    date[1] = selectedDates[i][1]
                    addNewDate = false
                    continue
                }

                if (date[0] <= v[0] && date[1] >= v[1]) {
                    selectedDates[i][0] = date[0]
                    selectedDates[i][1] = date[1]

                    date[0] = selectedDates[i][0]
                    date[1] = selectedDates[i][1]

                    addNewDate = false
                    continue
                }
            }
        }

        for(let i = 0; i < selectedDates.length; i++){
            let v1 = selectedDates[i];
            if(v1==null){break}

            for(let j = 0; j < selectedDates.length; j++){
                let v2 = selectedDates[j];
                if(v2==null){break}
                if(i == j){continue}

                if(v1[0] == v2[0] && v1[1] == v2[1]){
                    selectedDates.splice(j,1);
                    j--
                }
            }
        }        

        if(addNewDate){
            selectedDates.push(date)
        }

        sortDates()
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

        if(selectedDate==null){
            selectedDate = date
        }else{
            if(editMode){
                if(selectedDate>date){
                    deleteDate([date,selectedDate])
                }else{
                    deleteDate([selectedDate,date])
                }
            }else{
                if(selectedDate>date){
                    newDate([date,selectedDate])
                }else{
                    newDate([selectedDate,date])
                }
            }
            selectedDate = null
        }
        
        setDates(getDatesObject(selectedDates))
        setGrid(getGridObject(selectedMonth,selectedYear))
    }

    /**
     * this function is used to convert the date number to a date object
     * 
     * @param {number} date the date has a (year month day structure) e.g. 20250112 is 2025 Jan 12
     * @returns {[number, number, number]} the return is a array with the year, month, and day the month is stored here from 0-11
     */
    function decodeDateNumber(date) {
        const dateString = date.toString();
        const year = parseInt(dateString.slice(0, 4), 10);
        const month = parseInt(dateString.slice(4, 6), 10) - 1; // Subtract 1 to convert to 0-based month
        const day = parseInt(dateString.slice(6, 8), 10);
        return [year, month, day];
    }

    /**
     * this function returns the class name of the day, this is used to style the day
     * 
     * @param {number} date the date has a (year month day structure) e.g. 20250112 is 2025 Jan 12
     * @param {[number,number]} currentDate this is the current selected month and year month is stored as 0-11
     * @returns {string}
     */
    function getDayClassName(date,currentDate){
        let dayClass = ""
        let dateDecode = decodeDateNumber(date)
        if(dateDecode[1]!=currentDate[0]){
            dayClass += "other-month"
        }

        if(date==selectedDate){
            dayClass += " day-selected"
        }
        
        for (let i = 0; i < selectedDates.length; i++) {
            let v = selectedDates[i];
            if (date >= v[0] && date <= v[1]) {
                dayClass += " day-range"
            }

            if (date == v[0]) {
                dayClass += " day-range-start"
            }

            if (date == v[1]) {
                dayClass += " day-range-end"
            }
        }

        return dayClass
    }

    /**
     * this function is used to convert the date number to a HTML element for the dates column.
     * 
     * @param {number} date the dates have a (year month day structure) e.g. 18890420 is 1889 Apr 20
     * @param {number} i
     * @returns {Element}
     */
    function convertDateToHTML(date){
        let decodeNumber = decodeDateNumber(date)
        let month = getMonthName(decodeNumber[1]).substring(0,3)

        return(
            <span>
                {decodeNumber[2]} {month} {decodeNumber[0]}
            </span>
        )
    }

    /**
     * this function is called when the user clicks the trash icon, the date is removed from the selectedDates
     * 
     * @param {MouseEvent} e
     */
    function deleteDateBtn(e){
        e.preventDefault()
        const anchorElement = e.currentTarget
        const index = anchorElement.parentElement.parentElement.getAttribute("index")
        selectedDates.splice(index,1)
        setDates(getDatesObject(selectedDates))
        setGrid(getGridObject(selectedMonth,selectedYear))
    }

    /**
     * this function returns the selected dates as an HTML element
     * 
     * @param {[number,number][]} dates the dates have a (year month day structure) e.g. 18890420 is 1889 Apr 20
     * @returns {Element[]}
     */
    function getDatesObject(dates)
    {
        const tableData = []
        for(let i = 0; i < dates.length; i++){
            const date = dates[i]
            tableData.push(
                <div className="date" index={i}>
                    {convertDateToHTML(date[0])} - {convertDateToHTML(date[1])}
                    <a href="#trash"><img src={trashSVG} alt="" onClick={deleteDateBtn} /></a>
                </div>
            )
        }

        return tableData
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
                            className={getDayClassName(calDays[i*7+j].date,[month,year])}
                            dateNumber={calDays[i*7+j].date}
                            onClick={dayClick}
                            href="#day-click">{calDays[i*7+j].day}</a></td>
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
            selectedMonth = 0;
            selectedYear++;
        }else{
            selectedMonth++;
        }

        setSelectedMonth(selectedMonth)
        setSelectedYear(selectedYear)
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
            selectedMonth = 11;
            selectedYear--;
        }else{
            selectedMonth--;
        }

        setSelectedMonth(selectedMonth)
        setSelectedYear(selectedYear)
        setGrid(getGridObject(selectedMonth,selectedYear))
    }

    /**
     * this function is called when the user clicks the switch button, the edit mode is toggled
     * 
     * @param {MouseEvent} e 
     */
    function switchBtn(e){
        e.preventDefault()
        if(editMode){
            editMode = false
            setEditMode("switch-btn")
        }else{
            editMode = true
            setEditMode("switch-btn active")
        }
    }

    return(
        <div className="calender-container">
            <div className="calender">
                <div className="column">
                    <div className="header">
                        <h4>{getMonthName(selectedMonthState)} {selectedYearState}</h4>
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
                            {['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'].map((day) => (
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
                    <div className="wrapper">
                        {datesGridObject}
                    </div>
                </div>
            </div>
            <div className="options-column">
                <div className="option">
                    <h4>Switch edit mode</h4>
                    <a className={editModeClass} onClick={switchBtn} href="#switch-edit-mode"></a>
                </div>
            </div>
        </div>
    )
}

export default CalendarComponent;