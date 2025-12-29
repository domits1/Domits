function decodeDateNumber(date) {
    const dateString = date.toString();
    const year = parseInt(dateString.slice(0, 4), 10);
    const month = parseInt(dateString.slice(4, 6), 10) - 1; // Subtract 1 to convert to 0-based month
    const day = parseInt(dateString.slice(6, 8), 10);
    return [year, month, day];
}

export default decodeDateNumber