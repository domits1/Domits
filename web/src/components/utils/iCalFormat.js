function iCalFormat(event) {
    const { start, end, summary, description, location, uid, status, stamp, checkIn, checkOut, bookingId } = event;

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Domits/Domits Calendar//v1.0//EN
BEGIN:VEVENT
UID:${uid}
SEQUENCE:0
DTSTAMP:${stamp}
DTSTART:${start}
DTEND:${end}
SUMMARY:${summary}
DESCRIPTION:${description}
Check-In:${checkIn}
Check-Out:${checkOut}
Booking ID:${bookingId}
LOCATION:${location}
STATUS:${status}
END:VEVENT
END:VCALENDAR`;
}

export function formatDate(dateString) {
    const dt = new Date(dateString);
    return dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function formatDescription(description) {
    const desc = description.replace(/\n/g, '\\n');
    return desc;
}

export function formatLocation(accommodation) {
    if (!accommodation || !accommodation.Street || !accommodation.City || !accommodation.Country) {
        return 'Location data is incomplete';
    }

    const formattedLocation = String(accommodation.Street).replace(/,/g, '\\,') + ', ' +
        String(accommodation.City).replace(/,/g, '\\,') + ', ' +
        String(accommodation.Country).replace(/,/g, '\\,');

    return formattedLocation;
}

export function downloadICal(event) {
    const icsContent = iCalFormat(event);

    const blob = new Blob([icsContent], { type: 'text/calendar' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${event.summary}.ics`; // The name of the .ics file

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
}

const event = {
    uid: '0',
    sequence: '0',
    stamp: '',
    start: '',
    end: '',
    title: 'Placeholder',
    summary: 'Placeholder',
    description: 'Placeholder',
    checkIn: '',
    checkOut: '',
    bookingId: '0',
    location: 'Placeholder',
    status: 'TENTATIVE'
};

export default iCalFormat;

console.log(iCalFormat(event));
