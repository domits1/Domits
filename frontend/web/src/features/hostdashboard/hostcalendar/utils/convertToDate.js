function convertToNumDate(year, month, day) {
    return Number(
        `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`,
    );
}

export default convertToNumDate;