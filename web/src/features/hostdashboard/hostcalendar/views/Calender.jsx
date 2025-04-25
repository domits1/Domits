import { useState } from 'react';
import getMonthName from '../utils/GetMonth';
import GetMonthView from './MonthView';

import { ReactComponent as Left_arrow } from './left-arrow.svg';
import { ReactComponent as Right_arrow } from './right-arrow.svg';
import './../styles/Calender.scss'

/**
 * CalendarComponent is a component that displays a calendar
 * 
 * @param {Object} props
 * @param {*} props.passedProp
 * @param {boolean} props.isNew
 * @param {*} props.updateDates
 * @param {"host" | "guest"} props.calenderType
 * @param {1 | 2} props.displayMonths
 * 
 * @returns {JSX.Element}
 */
function CalendarComponent({ passedProp, isNew, updateDates, calenderType, displayMonths = 1 }) {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth());

    /**
     * this function handles the interaction when a day is clicked, it selects a new date
     *
     * @param {MouseEvent} e
     */
    function dayClick(e) {
        e.preventDefault();
        const anchorElement = e.currentTarget;
        let date = Number(anchorElement.getAttribute("date"));
        console.log(date)
    }

    /**
     * this function handles the interaction when next month button is clicked, it updates the month and year useStates
     *
     * @param {MouseEvent} e
     */
    function nextMonth(e){
        e.preventDefault()
        let newMonth = month + 1
        let newYear = year
        if(newMonth === 12){
            newYear = newYear + 1
            newMonth = 0
        }

        setMonth(newMonth)
        setYear(newYear)
    }

    /**
     * this function handles the interaction when prev month button is clicked, it updates the month and year useStates
     *
     * @param {MouseEvent} e
     */
    function prevMonth(e){
        e.preventDefault()
        let newMonth = month - 1
        let newYear = year
        if(newMonth === -1){
            newYear = newYear - 1
            newMonth = 11
        }

        setMonth(newMonth)
        setYear(newYear)
    }

    return (
        <div className="calender-container">
            <div className="column">
                <div className="calender-wrapper">
                    <div className="top-bar">
                        <a href='#btn' onClick={prevMonth}><Left_arrow/></a>
                        <h1> {getMonthName(month)} {year} </h1>
                        <a href='#btn' onClick={nextMonth}><Right_arrow/></a>
                    </div>
                    <div className="calender">
                        <GetMonthView year={year} month={month} dayClick={dayClick} />
                        {displayMonths === 2 && (
                            <GetMonthView
                                year={month === 11 ? year + 1 : year}
                                month={(month + 1) % 12}
                                dayClick={dayClick}
                            />
                        )}
                    </div>
                </div>
            </div>
            <div className="column">

            </div>
        </div>
    );
}

export default CalendarComponent;
