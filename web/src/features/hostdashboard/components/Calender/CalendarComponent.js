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
 * als jij niet begrijpt wat hier gebreurd verander dan ook niks als er iets aan gepast moet worden berijk mij dan via discord --@marijn3--
 */
import React, {useState} from "react";
import './Calendar.module.scss';
import leftArrowSVG from './left-arrow-calender.svg';
import rightArrowSVG from './right-arrow-calender.svg';


/**
 * 
 * @returns {JSX.Element}
 */
function CalendarComponent({passedProp, isNew, updateDates, componentView}) {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
    const [selectedMonthName, setSelectedMonthName] = useState(getMonthName(selectedMonth))
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

    const [calenderGridObject, setGrid] = useState(getGridObject(selectedMonth,selectedYear));

    /**
     * convertToNumDate is een functie dat jaar maand en dag omzet is een enkel date getal
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
     * deze dagen worden gebruikt om de calender dagen in te vullen
     * 
     * @param {number} month de maand wordt hier van 0-11 opgeslagen dus 0 is januari en 11 is decemnber
     * @param {number} year
     * @returns {{date: number, day: number}[]} de date heeft een (jaar maand dag struct) b.v. 20250112 is 2025 jan 12
     */
    function getCalDays(month, year) {
        const dateArray = [];
    
        const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
        const getDayOfWeek = (y, m, d) => (new Date(y, m, d).getDay() + 6) % 7; // 0 is maandag, 6 is zondag
    
        let prevMonth = (month + 11) % 12;
        let prevYear = month === 0 ? year - 1 : year;
        let nextMonth = (month + 1) % 12;
        let nextYear = month === 11 ? year + 1 : year;
    
        let prevMonthDays = getDaysInMonth(prevYear, prevMonth);
        let prevMonthLastDay = getDayOfWeek(prevYear, prevMonth, prevMonthDays);
        let daysInMonth = getDaysInMonth(year, month);
    
        // Voeg de dagen van de vorige maand toe
        for (let i = prevMonthDays - prevMonthLastDay; i <= prevMonthDays; i++) {
            dateArray.push({ date: convertToNumDate(prevYear, prevMonth + 1, i), day: i });
        }
    
        // Voeg de dagen van de huidige maand toe
        for (let i = 1; i <= daysInMonth; i++) {
            dateArray.push({ date: convertToNumDate(year, month + 1, i), day: i });
        }
    
        let remainingDays = 42 - dateArray.length; // Dit zorgt ervoor dat de kalender altijd 6 weken toont
    
        // Voeg de dagen van de volgende maand toe
        for (let i = 1; i <= remainingDays; i++) {
            dateArray.push({ date: convertToNumDate(nextYear, nextMonth + 1, i), day: i });
        }
    
        return dateArray;
    }

    /**
     * deze functie handeld de interactie af als er op een dag wordt geclickt het selecteerd een nieuwe datum
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
     * deze functie returns de maand dagen als een html element
     * 
     * @param {number} month de maand wordt hier van 0-11 opgeslagen dus 0 is januari en 11 is december
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
     * deze functie wordt gebruikt om de maand getal om te zetten naar een string zodat het in de html code gezet kan worden
     * 
     * @param {number} month de maand wordt hier van 0-11 opgeslagen dus 0 is januari en 11 is december
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
     * deze functie wordt angeroepen als de gebruiker op de nextMonth btn clickt dat wordt de Calender geupdate met de dagen van de volgende maand
     * 
     * @param {MouseEvent} e
     */
    function nextMonthBtn(e){
        e.preventDefault()

        if(selectedMonth==11){
            setSelectedMonth(0)
            setSelectedMonthName(getMonthName(selectedMonth))
            setSelectedYear(selectedYear + 1)
        }else{
            setSelectedMonth(selectedMonth + 1)
            setSelectedMonthName(getMonthName(selectedMonth))
        }

        setGrid(getGridObject(selectedMonth,selectedYear))
    }

    /**
     * deze functie wordt angeroepen als de gebruiker op de previusMonth btn clickt dat wordt de Calender geupdate met de dagen van de vorige maand
     * 
     * @param {MouseEvent} e
     */
    function previusMonthBtn(e){
        e.preventDefault()

        if(selectedMonth==0){
            setSelectedMonth(11)
            setSelectedMonthName(getMonthName(selectedMonth))
            setSelectedYear(selectedYear - 1)
        }else{
            setSelectedMonth(selectedMonth - 1)
            setSelectedMonthName(getMonthName(selectedMonth))
        }

        setGrid(getGridObject(selectedMonth,selectedYear))
    }

    return(
        <div className="calender-container">
            <div className="calender">
                <div className="column">
                    <div className="header">
                        <h4>{selectedMonthName} {selectedYear}</h4>
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
