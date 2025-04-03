/**
 * this function converts the selected dates to the datetypes in the database
 *
 * @return {{availableStartDate:number, availableEndDate:number}[]}
 */
function convertDatesToDBDates() {
    let updatedList = [];

    for (let i = 0; i < selectedDates.length(); i++) {
        let newDate = [];
        for (let j = 0; j < 2; j++) {
            let date = selectedDates[i][j].toString();

            const year = date.substring(0, 4);
            const month = date.substring(4, 6) - 1;
            const day = date.substring(6, 8);

            newDate.push(new Date(year, month, day).getTime());
        }
        updatedList.push(newDate);
    }
}

export default convertDatesToDBDates