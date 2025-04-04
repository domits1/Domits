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
import getGridObject from "../utils/getGridObject";

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
    const [selectedMonthState, setSelectedMonth] = useState(selectedMonth);
    const [selectedYearState, setSelectedYear] = useState(selectedYear);
    const [calenderGridObject, setGrid] = useState(
        getGridObject(selectedMonth, selectedYear,selectedDates,selectedDate,dayClick),
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
                    deleteDate([date, selectedDate], selectedDates);
                } else {
                    deleteDate([selectedDate, date], selectedDates);
                }
            } else {
                if (selectedDate > date) {
                    newDate([date, selectedDate], selectedDates);
                } else {
                    newDate([selectedDate, date], selectedDates);
                }
            }
            selectedDate = null;
        }

        setDates(getDatesObject(selectedDates));
        setGrid(getGridObject(selectedMonth, selectedYear,selectedDates,selectedDate,dayClick));
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
        setGrid(getGridObject(selectedMonth, selectedYear,selectedDates,selectedDate,dayClick));
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
        setGrid(getGridObject(selectedMonth, selectedYear,selectedDates,selectedDate,dayClick));
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
        setGrid(getGridObject(selectedMonth, selectedYear,selectedDates,selectedDate,dayClick));
    }

    /**
     * this function is called when the user clicks the switch button, the edit mode is toggled
     *
     * @param {MouseEvent} e
     */
    function switchBtnFunc(e) {
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
                {calenderType === 'host' && (
                    <div className="column">
                        <div className="wrapper">{datesGridObject}</div>
                    </div>
                )}
            </div>
            <div className="options-column">
                <div className="option">
                    <h4>Switch edit mode</h4>
                    <a
                        className={editModeClass}
                        onClick={switchBtnFunc}
                        href="#switch-edit-mode"
                    ></a>
                </div>
            </div>
        </div>
    );
}

export default CalendarComponent;
