import React, { useState, useEffect, useCallback } from "react";
import decodeDateNumber from "../utils/decodeDateNumber";
import convertDateToHTML from "../utils/convertDateToHTML";
import getCalDays from "../utils/getCalDays";
import newDateImmutable from "../utils/newDateImmutable"; // Assuming you create/adapt this
import deleteDateImmutable from "../utils/deleteDateImmutable"; // Assuming you create/adapt this
import getMonthName from "../utils/getMonthName";
import leftArrowSVG from "./left-arrow.svg";
import rightArrowSVG from "./right-arrow.svg";
import trashSVG from "./trash.svg";
import "./../styles/Calender.scss";

function CalendarComponent({ updateDates, calenderType, displayMonths = 1 }) {
    const [currentSelectedMonth, setCurrentSelectedMonth] = useState(new Date().getMonth());
    const [currentSelectedYear, setCurrentSelectedYear] = useState(new Date().getFullYear());
    const [currentlySelectedDates, setCurrentlySelectedDates] = useState([]); // Array of [startNum, endNum]
    const [firstSelection, setFirstSelection] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);

    const callUpdateDates = useCallback((datesArray) => {
        if (typeof updateDates === 'function') {
            try {
                const formattedDates = datesArray.map(range => {
                    const startDecoded = decodeDateNumber(range[0]);
                    const endDecoded = decodeDateNumber(range[1]);
                    // Ensure Date objects are created in UTC to avoid timezone offset issues
                    // The time part will be 00:00:00 UTC
                    const startDate = new Date(Date.UTC(startDecoded[0], startDecoded[1], startDecoded[2]));
                    const endDate = new Date(Date.UTC(endDecoded[0], endDecoded[1], endDecoded[2]));

                    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                        console.error("Invalid date created during formatting:", range);
                        return null; // Or handle error appropriately
                    }
                    return { startDate, endDate };
                }).filter(Boolean); // Filter out any nulls from errors

                console.log('[CalendarComponent] Calling updateDates with:', formattedDates);
                updateDates(formattedDates);
            } catch(error) {
                console.error("Error formatting dates for updateDates prop:", error);
                updateDates([]); // Send empty array on error
            }
        }
    }, [updateDates]);

    const dayClick = useCallback((e) => {
        e.preventDefault();
        const anchorElement = e.currentTarget;
        const dateNumber = Number(anchorElement.getAttribute("data-datenumber"));

        if (firstSelection === null) {
            setFirstSelection(dateNumber);
        } else {
            let newRange = [firstSelection, dateNumber].sort((a, b) => a - b);
            let updatedDates;

            if (isEditMode) {
                updatedDates = deleteDateImmutable(currentlySelectedDates, newRange);
            } else {
                updatedDates = newDateImmutable(currentlySelectedDates, newRange);
            }

            setCurrentlySelectedDates(updatedDates);
            callUpdateDates(updatedDates);
            setFirstSelection(null);
        }
    }, [firstSelection, isEditMode, currentlySelectedDates, callUpdateDates]);

    const getDayClassName = useCallback((date, currentMonth) => {
        let dayClass = "";
        let dateDecode = decodeDateNumber(date);
        if (dateDecode[1] !== currentMonth) {
            dayClass += "other-month";
        }

        if (date === firstSelection) {
            dayClass += " day-selected";
        }

        currentlySelectedDates.forEach(v => {
            if (date >= v[0] && date <= v[1]) {
                dayClass += " day-range";
            }
            if (date === v[0]) {
                dayClass += " day-range-start";
            }
            if (date === v[1]) {
                dayClass += " day-range-end";
            }
        });

        return dayClass.trim();
    }, [firstSelection, currentlySelectedDates]);


    const deleteDateBtn = useCallback((e) => {
        e.preventDefault();
        const index = Number(e.currentTarget.closest('.date')?.getAttribute("data-index"));
        if (typeof index === 'number' && !isNaN(index)) {
            const updatedDates = currentlySelectedDates.filter((_, i) => i !== index);
            setCurrentlySelectedDates(updatedDates);
            callUpdateDates(updatedDates);
        }
    }, [currentlySelectedDates, callUpdateDates]);

    const getDatesObject = useCallback((dates) => {
        return dates.map((date, i) => (
          <div className="date" data-index={i} key={`date-${date[0]}-${i}`}>
              {convertDateToHTML(date[0])} - {convertDateToHTML(date[1])}
              {calenderType === 'host' && (
                <button onClick={deleteDateBtn} className="delete-date-btn" aria-label="Delete date range">
                    <img src={trashSVG} alt="Delete" />
                </button>
              )}
          </div>
        ));
    }, [deleteDateBtn, calenderType]);

    const getGridObject = useCallback((month, year) => {
        const calDays = getCalDays(month, year);
        const rows = [];

        for (let i = 0; i < 6; i++) {
            rows.push(
              <tr key={`week-${year}-${month}-${i}`}>
                  {[...Array(7)].map((_, j) => {
                      const dayIndex = i * 7 + j;
                      const dayData = calDays[dayIndex];
                      if (!dayData) return <td key={`empty-${j}`}></td>; // Handle potential empty cells if logic changes

                      const dateNum = dayData.date;
                      const dayDisplay = dayData.day;

                      return (
                        <td key={`day-${dateNum}`}>
                            <button
                              className={`day-button ${getDayClassName(dateNum, month)}`}
                              data-datenumber={dateNum}
                              onClick={dayClick}
                            >
                                {dayDisplay}
                            </button>
                        </td>
                      );
                  })}
              </tr>,
            );
        }
        return rows;
    }, [dayClick, getDayClassName]);


    const nextMonthBtn = useCallback((e) => {
        e.preventDefault();
        setCurrentSelectedMonth(prevMonth => {
            if (prevMonth === 11) {
                setCurrentSelectedYear(prevYear => prevYear + 1);
                return 0;
            } else {
                return prevMonth + 1;
            }
        });
    }, []);

    const previousMonthBtn = useCallback((e) => {
        e.preventDefault();
        setCurrentSelectedMonth(prevMonth => {
            if (prevMonth === 0) {
                setCurrentSelectedYear(prevYear => prevYear - 1);
                return 11;
            } else {
                return prevMonth - 1;
            }
        });
    }, []);

    const switchBtn = useCallback((e) => {
        e.preventDefault();
        setIsEditMode(prevMode => !prevMode);
        setFirstSelection(null); // Reset selection when switching modes
    }, []);

    const calenderGrid = getGridObject(currentSelectedMonth, currentSelectedYear);
    const datesList = getDatesObject(currentlySelectedDates);
    const editModeClass = isEditMode ? "switch-btn active" : "switch-btn";

    return (
      <div className="calender-container">
          <div className="calender">
              <div className="column">
                  <div className="header">
                      <h4>
                          {getMonthName(currentSelectedMonth)} {currentSelectedYear}
                      </h4>
                      <div className="btn-container">
                          <button onClick={previousMonthBtn} aria-label="Previous month">
                              <img src={leftArrowSVG} alt="Previous" />
                          </button>
                          <button onClick={nextMonthBtn} aria-label="Next month">
                              <img src={rightArrowSVG} alt="Next" />
                          </button>
                      </div>
                  </div>
                  <div className="days">
                      <div className="day-labels">
                          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
                            <div className="day-label" key={day}>
                                <span>{day}</span>
                            </div>
                          ))}
                      </div>
                      <table className="calender-days">
                          <tbody>
                          {calenderGrid}
                          </tbody>
                      </table>
                  </div>
              </div>
              {calenderType === 'host' && (
                <div className="column">
                    <h4>Selected Ranges</h4>
                    <div className="wrapper dates-list">{datesList}</div>
                </div>
              )}
          </div>
          {calenderType === 'host' && (
            <div className="options-column">
                <div className="option">
                    <h4>Switch add/remove mode</h4>
                    <button
                      className={editModeClass}
                      onClick={switchBtn}
                      aria-label={isEditMode ? "Switch to add mode" : "Switch to remove mode"}
                    >
                        <span className="switch-indicator"></span>
                    </button>
                    <span>{isEditMode ? "Remove" : "Add"}</span>
                </div>
            </div>
          )}
      </div>
    );
}

export default CalendarComponent;