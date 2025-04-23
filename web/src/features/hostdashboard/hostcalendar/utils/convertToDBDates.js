//This is written by Marijn Klappe
/**
 * this function converts the selected dates to the datetypes in the database
 *
 * @return {{availableStartDate:number, availableEndDate:number}[]}
 */
function convertDatesToDBDates(selectedDates) {
    let updatedList = [];

    for (let i = 0; i < selectedDates.length; i++) {
        let newDate = {};
        let date = selectedDates[i][0].toString();

        const year = date.substring(0, 4);
        const month = date.substring(4, 6) - 1;
        const day = date.substring(6, 8);

        newDate["availableStartDate"] = new Date(year, month, day).getTime();

        let date2 = selectedDates[i][1].toString();

        const year2 = date2.substring(0, 4);
        const month2 = date2.substring(4, 6) - 1;
        const day2 = date2.substring(6, 8);
        newDate["availableEndDate"] = new Date(year2, month2, day2).getTime();
        updatedList.push(newDate);
    }
    console.log(updatedList)
    return updatedList
}

export default convertDatesToDBDates