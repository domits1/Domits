import sortDates from "./sortDates";
/**
 * this function adds a new date to the selectedDates array it also makes shore that the dates dont overlap
 *
 * @param {[number,number]} date
 * @param {[number,number][]} selectedDates
 */
function newDate(date,selectedDates) {
    let addNewDate = true;

    for (let _ = 0; _ < 2; _++) {
        for (let i = 0; i < selectedDates.length; i++) {
            let v = selectedDates[i];

            if (
                date[0] >= v[0] &&
                date[0] <= v[1] &&
                date[1] >= v[0] &&
                date[1] <= v[1]
            ) {
                addNewDate = false;
                continue;
            }

            if (date[0] >= v[0] && date[0] <= v[1] && date[1] > v[1]) {
                selectedDates[i][1] = date[1];
                date[0] = selectedDates[i][0];
                addNewDate = false;
                continue;
            }

            if (date[1] >= v[0] && date[1] <= v[1] && date[0] < v[0]) {
                selectedDates[i][0] = date[0];
                date[1] = selectedDates[i][1];
                addNewDate = false;
                continue;
            }

            if (date[0] <= v[0] && date[1] >= v[1]) {
                selectedDates[i][0] = date[0];
                selectedDates[i][1] = date[1];

                date[0] = selectedDates[i][0];
                date[1] = selectedDates[i][1];

                addNewDate = false;
            }
        }
    }

    for (let i = 0; i < selectedDates.length; i++) {
        let v1 = selectedDates[i];
        if (v1 == null) {
            break;
        }

        for (let j = 0; j < selectedDates.length; j++) {
            let v2 = selectedDates[j];
            if (v2 == null) {
                break;
            }
            if (i == j) {
                continue;
            }

            if (v1[0] == v2[0] && v1[1] == v2[1]) {
                selectedDates.splice(j, 1);
                j--;
            }
        }
    }

    if (addNewDate) {
        selectedDates.push(date);
    }

    sortDates(selectedDates);
}

export default newDate