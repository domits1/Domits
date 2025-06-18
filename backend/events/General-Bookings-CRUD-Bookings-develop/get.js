import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.js"
import { getAuthToken } from "../../test/util/getAuthToken.js";

async function get(){
    console.log(await handler({
        httpMethod: "GET",
        readType: "propertyId",
        resource: "/bookings",
        path: "/bookings",
        headers: {
            Authorization: "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI0ZmE5YjI1Yi0xZmQzLTRjMGUtYjdjZi1hZjk3NTQ3OTYxOWMiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6ImI1YmZkNWY0LWQ5MjEtNDYxNi04YTM4LTczZmFkOGEzMGVmYSIsImV2ZW50X2lkIjoiZjZmMTEzMzgtNmNmNC00MDI3LWI0MWEtMWRiMTZjMjQyZmM5IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc1MDA3Njg5MiwiZXhwIjoxNzUwMjM0NjQ5LCJpYXQiOjE3NTAyMzEwNDksImp0aSI6ImMyMjM0MWRiLWIxOGItNDQyYS1hZTVlLWU1MmVkNTMxNTBmMSIsInVzZXJuYW1lIjoiNGZhOWIyNWItMWZkMy00YzBlLWI3Y2YtYWY5NzU0Nzk2MTljIn0.EGQFGwHVH6xrhR6fysgNC4yKVq1UL6mLdye6l63xZIoSv4ZW8Y5Sj54Bb39QRXrhLK6tRen5rKpxPoNDlKmjkjDG9lRr4DjLV8oLBq-t54uXUhFtjQDClLSzls8sWPwUbhC42sI-hPS-hqhxyfHWPiQ6Eckz9FEPpndtuVAJtjMdIJVe747NsonyxQrhnwwVykCd8g3aAAcWZu_1nQvLrDNJUN55bQvj6_ZTOMpZ7dvwWAb1TQvhrKCLBprd77RK9j2emm87zsjvYNKD81AqCcoo3SiU993MAUqRV9xEEMWkT2GPMxRZ2xXbZ5FRkhqvN6dgn1IWKtYZdjJk_ZLkWA",
        },
        queryStringParameters: {
            readType: "guest",
        }
    }));
}

get();