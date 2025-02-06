
/**
    const asyncSaveDates = async () => {
        const body = {
            DateRanges: selectedRanges,
            MinimumStay: minimumStay,
            MinimumAdvanceReservation: minimumAdvanceReservation,
            MaximumStay: maximumStay,
            MaximumAdvanceReservation: maximumAdvanceReservation,
            ID: passedProp.ID
        };

        console.log(body);
        try {
            const response = await fetch('https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/Host-Onboarding-Production-Update-AccommodationStayParameters', {
                method: 'PUT',
                body: JSON.stringify(body),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                }
            });
            if (!response.ok) {
                alert("Something went wrong, please try again later...");
                throw new Error('Failed to fetch');
            } else {
                const data = await response.json();
                const jsonData = JSON.parse(data.body);
                if (jsonData.updatedAttributes) {
                    const updatedAttributes = jsonData.updatedAttributes;
                    passedProp.DateRanges = updatedAttributes.DateRanges;
                    alert("Update successful!");
                } else {
                    alert("Something went wrong, please try again later...");
                    console.log("updatedAttributes is missing in the response");
                }
            }+
        } catch (error) {
            console.error("Unexpected error:", error);
        } finally {
            navigate(0);
        }
    };
*/

/**
 * Dit is geschreven door Marijn Klappe
 * 
 * als jij niet begrijpt wat hier gebreurd verander dan ook niks als er iets aan gepast moet worden berijk mij dan via discord --marijn3--
 */
import React, {useEffect, useState} from "react";
import './Calendar.module.scss';


/**
 * convertToNumDate is een functie dat jaar maand en dag omzet is een enkele date getal
 * 
 * @param {number} year
 * @param {number} month deze maand telling is 1-12 dus 1 is januari en 12 is december
 * @param {number} day
 * @returns {number} de return heeft een (jaar maand dag struct) b.v. 20250112 is 2025 jan 12
 */
function convertToNumDate(year, month, day){
    return Number(`${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`);
}

/**
 * getCalDays is een functie die wordt gebruikt om de dag getallen op te halen van geselecteerde maand en jaar.
 * deze dagen worden zichtbaar in de calender
 * 
 * @param {number} month de maand wordt hier van 0-11 opgeslagen dus 0 is januari en 11 is decemnber
 * @param {number} year
 * @returns {{date: number, day: number}[]} de date heeft een (jaar maand dag struct) b.v. 20250112 is 2025 jan 12
 */
function getCalDays(month,year){
    const dateArray = []

    let previusMonth = month - 1
    let previusYear = year

    if(previusMonth == -1){
        previusMonth = 11
        previusYear--
    }

    let nextMonth = month + 1
    let nextyear = year

    if(nextMonth == 12){
        nextMonth = 0
        nextyear++
    }

    let previusMonthLastDay = new Date(previusYear, previusMonth + 1, 0).getDay()-1 // de dagen telling gaat van -1-5 0 is maandag -1 is zondag
    let previusMonthDays = new Date(previusYear, previusMonth + 1, 0).getDate()

    let daysInMonth = new Date(year, month + 1, 0).getDate()

    let nextMonthFirstDay = new Date(nextyear, nextMonth, 1).getDay()-1; // de dagen telling gaat van -1-5 0 is maandag -1 is zondag

    for(let i = previusMonthLastDay;i >= 0; i--){
        let dayIndex = previusMonthDays-i
        dateArray.push({date: convertToNumDate(previusYear,previusMonth+1,dayIndex),day: dayIndex})
    }

    for(let i = 1; i <= daysInMonth; i++){
        dateArray.push({date: convertToNumDate(year,month+1,i),day: i})
    }

    let addRow = 0
    if(dateArray.length < 35){
        addRow = 7
    }
    for(let i = 1; i <= 7-nextMonthFirstDay+addRow;i++){
        dateArray.push({date: convertToNumDate(nextyear,nextMonth+1,i),day: i})
    }

    return dateArray
}

function CalendarComponent({passedProp, isNew, updateDates, componentView}) {

    const calenderGrid = Array(6).fill(Array(7).fill({dayNumber: 2, isDate: 0, selected: false}));
    const [calenderGridObject, setGrid] = useState(calenderGrid);

    function dayClick(e,row,column){
        e.preventDefault()
        getCalDays(7,2025)
    }

    return(
        <div className="calender">
            <div className="column">
                <div className="header">

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
                        {calenderGridObject.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                            {row.map((cell, colIndex) => (
                                <td>
                                    <a href="" key={colIndex} onClick={(e) => dayClick(e,rowIndex, colIndex)}>
                                        {cell.dayNumber}
                                    </a>
                                </td>
                            ))}
                            </tr>
                        ))}
                    </table>
                </div>
            </div>
            <div className="column">
                
            </div>
        </div>
    )
}

export default CalendarComponent;
