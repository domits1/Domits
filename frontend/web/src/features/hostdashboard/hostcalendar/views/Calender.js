/**
 * This is written by Marijn Klappe
 *
 * If you do not understand what is happening here, do not change anything. If something needs to be adjusted, contact me via discord --@marijn3--
 */
import React, { useMemo, useState } from "react";
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

const pad2 = (n) => String(n).padStart(2, "0");

const dateNumberToLocalYmd = (dateNumber) => {
  const [year, month0, day] = decodeDateNumber(dateNumber);
  return `${year}-${pad2(month0 + 1)}-${pad2(day)}`;
};

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
function CalendarComponent({
  passedProp,
  isNew,
  updateDates,
  calenderType,
  builder,
  displayMonths = 1,
  externalBlockedDates,
}) {
  const [selectedMonthState, setSelectedMonth] = useState(selectedMonth);
  const [selectedYearState, setSelectedYear] = useState(selectedYear);
  const [calenderGridObject, setGrid] = useState(
    getGridObject(selectedMonth, selectedYear)
  );
  const [datesGridObject, setDates] = useState(getDatesObject(selectedDates));
  const [editModeClass, setEditMode] = useState("switch-btn");

  const blockedSet = useMemo(() => {
    return externalBlockedDates instanceof Set ? externalBlockedDates : new Set();
  }, [externalBlockedDates]);

  function emitSelectedDates() {
    const payload = convertDatesToDBDates(selectedDates);
    if (builder?.addAvailability) {
      builder.addAvailability(payload);
      return;
    }
    if (typeof updateDates === "function") {
      updateDates(payload);
    }
  }

  function dayClick(e) {
    e.preventDefault();
    const anchorElement = e.currentTarget;
    const date = Number(anchorElement.getAttribute("dateNumber"));

    const ymd = dateNumberToLocalYmd(date);
    if (blockedSet.has(ymd)) return;

    if (selectedDate == null) {
      selectedDate = date;
    } else {
      const range = selectedDate > date ? [date, selectedDate] : [selectedDate, date];
      if (editMode) deleteDate(range, selectedDates);
      else newDate(range, selectedDates);
      selectedDate = null;
    }

    setDates(getDatesObject(selectedDates));
    setGrid(getGridObject(selectedMonth, selectedYear));
    emitSelectedDates();
  }

  function getDayClassName(date, currentDate) {
    let dayClass = "";
    const dateDecode = decodeDateNumber(date);

    if (dateDecode[1] != currentDate[0]) {
      dayClass += "other-month";
    }

    if (date == selectedDate) {
      dayClass += " day-selected";
    }

    for (let i = 0; i < selectedDates.length; i++) {
      const v = selectedDates[i];

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

    const ymd = dateNumberToLocalYmd(date);
    if (blockedSet.has(ymd)) {
      dayClass += " external-blocked";
    }

    return dayClass;
  }

  function deleteDateBtn(e) {
    e.preventDefault();
    const anchorElement = e.currentTarget;
    const index = Number(
      anchorElement.parentElement.parentElement.getAttribute("index")
    );

    if (!Number.isFinite(index)) return;

    selectedDates.splice(index, 1);
    setDates(getDatesObject(selectedDates));
    setGrid(getGridObject(selectedMonth, selectedYear));
    emitSelectedDates();
  }

  function getDatesObject(dates) {
    const tableData = [];
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      tableData.push(
        <div className="date" index={i} key={`${date[0]}-${date[1]}-${i}`}>
          {convertDateToHTML(date[0])} - {convertDateToHTML(date[1])}
          <a href="#trash">
            <img src={trashSVG} alt="" onClick={deleteDateBtn} />
          </a>
        </div>
      );
    }
    return tableData;
  }

  function getGridObject(month, year) {
    const calDays = getCalDays(month, year);
    const tableData = [];

    for (let i = 0; i < 6; i++) {
      tableData.push(
        <tr key={`row-${year}-${month}-${i}`}>
          {[...Array(7)].map((_, j) => {
            const cell = calDays[i * 7 + j];
            const dateNumber = cell.date;

            const ymd = dateNumberToLocalYmd(dateNumber);
            const isBlocked = blockedSet.has(ymd);

            return (
              <td key={`cell-${year}-${month}-${i}-${j}`}>
                <a
                  className={getDayClassName(dateNumber, [month, year])}
                  dateNumber={dateNumber}
                  onClick={isBlocked ? (ev) => ev.preventDefault() : dayClick}
                  href="#day-click"
                  aria-disabled={isBlocked ? "true" : "false"}
                >
                  {cell.day}
                </a>
              </td>
            );
          })}
        </tr>
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
                <div className="day-label" key={day}>
                  <span>{day}</span>
                </div>
              ))}
            </div>

            <table className="calender-days">{calenderGridObject}</table>
          </div>
        </div>

        {calenderType === "host" && (
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