import {Storage} from 'aws-amplify';

const S3_BUCKET_NAME = "icalender";
const region = 'eu-north-1';

function iCalFormat(events) {
    let icsContent = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Domits/Domits Calendar//v1.0//EN`;

    events.forEach(event => {
        const {Dtstamp, Dtstart, Dtend, Summary, Location, UID, AccommodationId} = event;

        icsContent += `\r\nBEGIN:VEVENT\r\n`
        icsContent += `UID:${UID}\r\n`
        icsContent += `DTSTAMP:${formatICalDateTime(Dtstamp)}\r\n`
        icsContent += `DTSTART:${formatICalDateTime(Dtstart)}\r\n`
        icsContent += `DTEND:${formatICalDateTime(Dtend)}\r\n`
        icsContent += `SUMMARY:${foldICalLine(Summary)}\r\n`
        icsContent += `LOCATION:${foldICalLine(Location)}\r\n`
        icsContent += `ACCOMMODATION-ID:${AccommodationId}\r\n`
        icsContent += `END:VEVENT`;
    });

    icsContent += '\r\nEND:VCALENDAR';

    return icsContent;
}


export function formatDate(dateString) {
    const dt = new Date(dateString);
    const offset = dt.getTimezoneOffset();
    dt.setMinutes(dt.getMinutes() - offset);

    return dt.toISOString().replace(/-/g, '-').split('.')[0];
}

function formatICalDateTime(dateTime) {
    if (!dateTime || isNaN(new Date(dateTime).getTime())) {
        console.error("Invalid date provided:", dateTime);
        return '';
    }

    const dt = new Date(dateTime);

    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const hours = String(dt.getHours()).padStart(2, '0');
    const minutes = String(dt.getMinutes()).padStart(2, '0');
    const seconds = String(dt.getSeconds()).padStart(2, '0');

    const formattedDate = `${year}${month}${day}`;
    const formattedTime = `${hours}${minutes}${seconds}`;

    return formattedDate + 'T' + formattedTime;
}

function foldICalLine(inputString) {
    const maxLineLength = 60;
    let foldedString = '';

    for (let i = 0; i < inputString.length; i += maxLineLength) {
        foldedString += inputString.substring(i, i + maxLineLength) + (i + maxLineLength < inputString.length ? '\r\n ' : '');
    }

    return foldedString;
}

// export function downloadICal(event) {
//     const icsContent = iCalFormat(event);
//
//     const blob = new Blob([icsContent], { type: 'text/calendar' });
//
//     const link = document.createElement('a');
//     link.href = URL.createObjectURL(blob);
//     link.download = `${event.Summary}.ics`; // The name of the .ics file
//
//     document.body.appendChild(link);
//
//     link.click();
//
//     document.body.removeChild(link);
// }

export async function uploadICalToS3(events, userId) {
    const icsContent = iCalFormat(events);

    const blob = new Blob([icsContent], {type: 'text/calendar'});
    const fileKey = `hosts/${userId}/${userId}.ics`;

    try {
        const arrayBuffer = await blob.arrayBuffer();

        const result = await Storage.put(fileKey, arrayBuffer, {
            contentType: 'text/calendar',
            bucket: S3_BUCKET_NAME,
            region: region,
            level: 'public',
            customPrefix: {public: ''},
        });

        const url = `https://${S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${fileKey}`;
        return url;
    } catch (err) {
        console.error("Failed to upload iCal to S3:", err);
        throw err;
    }
}

export default iCalFormat;
