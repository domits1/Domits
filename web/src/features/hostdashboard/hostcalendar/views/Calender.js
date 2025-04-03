/**
 * This is written by Marijn Klappe
 *
 * If you do not understand what is happening here, do not change anything. If something needs to be adjusted, contact me via discord --@marijn3--
 */
import React, { useState } from "react";
import convertDatesToDBDates from "../utils/convertToDBDates";
import decodeDateNumber from "../utils/decodeDateNumber";
import convertDateToHTML from "../utils/convertDateToHTML";
import getCalDays from "../utils/getCalDays";
import newDate from "../utils/newDate";
import deleteDate from "../utils/deleteDate";
import getMonthName from "../utils/getMonthName";
import leftArrowSVG from "./left-arrow.svg";
import rightArrowSVG from "./right-arrow.svg";
import trashSVG from "./trash.svg";
import "./../styles/Calender.scss";

let selectedDate = null;
let selectedDates = [];
let selectedMonth = new Date().getMonth();
let selectedYear = new Date().getFullYear();
let editMode = false;

/**
 * CalendarComponent is a component that displays a calendar
 * 
 * @param {string} calenderType
 * @returns {JSX.Element}
 */
function CalendarComponent({ passedProp, isNew, updateDates, calenderType}) {
    const [selectedMonthState, setSelectedMonth] = useState(selectedMonth);
    const [selectedYearState, setSelectedYear] = useState(selectedYear);
    const [calenderGridObject, setGrid] = useState(
        getGridObject(selectedMonth, selectedYear),
    );
    const [datesGridObject, setDates] = useState(getDatesObject(selectedDates));
    const [editModeClass, setEditMode] = useState("switch-btn");

    /**
     * this function handles the interaction when a day is clicked, it selects a new date
     *
     * @param {MouseEvent} e
     */
    function dayClick(e) {
        e.preventDefault();
        const anchorElement = e.currentTarget;
        let date = Number(anchorElement.getAttribute("dateNumber"));

        if (selectedDate == null) {
            selectedDate = date;
        } else {
            if (editMode) {
                if (selectedDate > date) {
                    deleteDate([date, selectedDate],selectedDates);
                } else {
                    deleteDate([selectedDate, date],selectedDates);
                }
            } else {
                if (selectedDate > date) {
                    newDate([date, selectedDate],selectedDates);
                } else {
                    newDate([selectedDate, date],selectedDates);
                }
            }
            selectedDate = null;
        }

        setDates(getDatesObject(selectedDates));
        setGrid(getGridObject(selectedMonth, selectedYear));
    }

    /**
     * this function returns the class name of the day, this is used to style the day
     *
     * @param {number} date the date has a (year month day structure) e.g. 20250112 is 2025 Jan 12
     * @param {[number,number]} currentDate this is the current selected month and year month is stored as 0-11
     * @returns {string}
     */
    function getDayClassName(date, currentDate) {
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

    /**
     * this function is called when the user clicks the trash icon, the date is removed from the selectedDates
     *
     * @param {MouseEvent} e
     */
    function deleteDateBtn(e) {
        e.preventDefault();
        const anchorElement = e.currentTarget;
        const index =
            anchorElement.parentElement.parentElement.getAttribute("index");
        selectedDates.splice(index, 1);
        setDates(getDatesObject(selectedDates));
        setGrid(getGridObject(selectedMonth, selectedYear));
    }

    /**
     * this function returns the selected dates as an HTML element
     *
     * @param {[number,number][]} dates the dates have a (year month day structure) e.g. 18890420 is 1889 Apr 20
     * @returns {Element[]}
     */
    function getDatesObject(dates) {
        const tableData = [];
        for (let i = 0; i < dates.length; i++) {
            const date = dates[i];
            tableData.push(
                <div className="date" index={i}>
                    {convertDateToHTML(date[0])} - {convertDateToHTML(date[1])}
                    <a href="#trash">
                        <img src={trashSVG} alt="" onClick={deleteDateBtn} />
                    </a>
                </div>,
            );
        }

        return tableData;
    }

    /**
     * this function returns the month days as an HTML element
     *
     * @param {number} month the month is stored here from 0-11 so 0 is January and 11 is December
     * @param {number} year
     * @returns {Element[]}
     */
    function getGridObject(month, year) {
        const calDays = getCalDays(month, year);
        const tableData = [];

        for (let i = 0; i < 6; i++) {
            tableData.push(
                <tr>
                    {[...Array(7)].map((_, j) => (
                        <td>
                            <a
                                className={getDayClassName(calDays[i * 7 + j].date, [
                                    month,
                                    year,
                                ])}
                                dateNumber={calDays[i * 7 + j].date}
                                onClick={dayClick}
                                href="#day-click"
                            >
                                {calDays[i * 7 + j].day}
                            </a>
                        </td>
                    ))}
                </tr>,
            );
        }

        return tableData;
    }

    /**
     * this function is called when the user clicks the nextMonth button, the Calendar is updated with the days of the next month
     *
     * @param {MouseEvent} e
     */
    function nextMonthBtn(e) {
        e.preventDefault();

        if (selectedMonth == 11) {
            selectedMonth = 0;
            selectedYear++;
        } else {
            selectedMonth++;
        }

        setSelectedMonth(selectedMonth);
        setSelectedYear(selectedYear);
        setGrid(getGridObject(selectedMonth, selectedYear));
    }

    /**
     * this function is called when the user clicks the previousMonth button, the Calendar is updated with the days of the previous month
     *
     * @param {MouseEvent} e
     */
    function previusMonthBtn(e) {
        e.preventDefault();

        if (selectedMonth == 0) {
            selectedMonth = 11;
            selectedYear--;
        } else {
            selectedMonth--;
        }

        setSelectedMonth(selectedMonth);
        setSelectedYear(selectedYear);
        setGrid(getGridObject(selectedMonth, selectedYear));
    }

    /**
     * this function is called when the user clicks the switch button, the edit mode is toggled
     *
     * @param {MouseEvent} e
     */
    function switchBtn(e) {
        e.preventDefault();
        if (editMode) {
            editMode = false;
            setEditMode("switch-btn");
        } else {
            editMode = true;
            setEditMode("switch-btn active");
        }
    }

    return (
        <div className="calender-container">
            <div className="calender">
                <div className="column">
                    <div className="header">
                        <h4>
                            {getMonthName(selectedMonthState)} {selectedYearState}
                        </h4>
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
                            {["mo", "tu", "we", "th", "fr", "sa", "su"].map((day) => (
                                <div className="day-label">
                                    <span>{day}</span>
                                </div>
                            ))}
                        </div>
                        <table className="calender-days">{calenderGridObject}</table>
                    </div>
                </div>
                <div className="column">
                    <div className="wrapper">{datesGridObject}</div>
                </div>
            </div>
            <div className="options-column">
                <div className="option">
                    <h4>Switch edit mode</h4>
                    <a
                        className={editModeClass}
                        onClick={switchBtn}
                        href="#switch-edit-mode"
                    ></a>
                </div>
            </div>
        </div>
    );
}

export default CalendarComponent;
