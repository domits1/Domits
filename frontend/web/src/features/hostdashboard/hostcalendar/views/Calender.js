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
import "../styles/Calender.scss";

let selectedDate = null;
let selectedDates = [];
let selectedMonth = new Date().getMonth();
let selectedYear = new Date().getFullYear();
let editMode = false;

function CalendarComponent({ passedProp, isNew, updateDates, calenderType,builder, displayMonths = 1 }) {
    const [selectedMonthState, setSelectedMonth] = useState(selectedMonth);
    const [selectedYearState, setSelectedYear] = useState(selectedYear);
    const [calenderGridObject, setGrid] = useState(
        getGridObject(selectedMonth, selectedYear),
    );
    const [datesGridObject, setDates] = useState(getDatesObject(selectedDates));
    const [editModeClass, setEditMode] = useState("switch-btn");
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
        setGrid(getGridObject(selectedMonth, selectedYear));

        builder.addAvailability(convertDatesToDBDates(selectedDates));
    }
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
    function deleteDateBtn(e) {
        e.preventDefault();
        const anchorElement = e.currentTarget;
        const index =
            anchorElement.parentElement.parentElement.getAttribute("index");
        selectedDates.splice(index, 1);
        setDates(getDatesObject(selectedDates));
        setGrid(getGridObject(selectedMonth, selectedYear));
    }
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
                        onClick={switchBtn}
                        href="#switch-edit-mode"
                    ></a>
                </div>
            </div>
        </div>
    );
}

export default CalendarComponent;
