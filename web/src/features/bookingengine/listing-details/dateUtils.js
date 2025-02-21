import DateFormatterYYYY_MM_DD from "../../utils/DateFormatterYYYY_MM_DD";

export const setDates = (StartDate, EndDate, bookedDates, setMinStart, setMaxStart, setMinEnd, setMaxEnd, setBookedDates) => {
    const today = new Date();
    const parsedStartDate = today > new Date(StartDate) ? today : new Date(StartDate);
    const parsedEndDate = new Date(EndDate);
    const maxStart = new Date(parsedEndDate);
    maxStart.setUTCDate(maxStart.getUTCDate() - 1);

    const minEnd = new Date(parsedStartDate);
    minEnd.setUTCDate(minEnd.getUTCDate() + 1);

    setMinStart(DateFormatterYYYY_MM_DD(parsedStartDate));
    setMaxStart(DateFormatterYYYY_MM_DD(maxStart));
    setMinEnd(DateFormatterYYYY_MM_DD(minEnd));
    setMaxEnd(DateFormatterYYYY_MM_DD(parsedEndDate));
    setBookedDates(bookedDates); // Save booked dates in state
};

export const restrictCheckOutToDateRange = (checkIn, accommodation, setMaxEnd) => {
    if (checkIn) {
        for (let i = 0; i < accommodation.DateRanges.length; i++) {
            let index = accommodation.DateRanges[i];
            if (isDateInRange(new Date(checkIn), new Date(index.startDate), new Date(index.endDate))) {
                setMaxEnd(DateFormatterYYYY_MM_DD(new Date(index.endDate)));
            }
        }
    } else {
        setMaxEnd(null);
    }
};

export const restrictCheckInToDateRange = (checkOut, accommodation, setMinStart) => {
    if (checkOut) {
        for (let i = 0; i < accommodation.DateRanges.length; i++) {
            let index = accommodation.DateRanges[i];
            if (isDateInRange(new Date(checkOut), new Date(index.startDate), new Date(index.endDate))) {
                setMinStart(DateFormatterYYYY_MM_DD(new Date(index.startDate)));
            }
        }
    } else {
        setMinStart(null);
    }
};