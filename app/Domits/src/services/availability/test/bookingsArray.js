const bookingsArray = [
    {arrivalDate: getFutureDate(3), departureDate: getFutureDate(10)}
]

function getFutureDate(daysInTheFuture) {
    const date = new Date();
    date.setDate(date.getDate() + daysInTheFuture);
    return date;
}