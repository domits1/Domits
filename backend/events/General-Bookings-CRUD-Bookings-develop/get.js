import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.js"
import { getAuthToken } from "../../test/util/getAuthToken.js";

async function get(){
    console.log(await handler({
        httpMethod: "GET",
        readType: "propertyId",
        resource: "/bookings",
        path: "/bookings",
        headers: {
            Authorization: "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI0ZmE5YjI1Yi0xZmQzLTRjMGUtYjdjZi1hZjk3NTQ3OTYxOWMiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6ImI1OTJhNWZlLWU5MjEtNDIyMy04ODY1LWQ4MGFlODdjYWQ1OCIsImV2ZW50X2lkIjoiOTJjYjU5YzQtNDI4Zi00MDJlLWJkZTAtYzcwMGYyNmRkNGZmIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc0OTYyNDg1NSwiZXhwIjoxNzQ5NjMyMTYxLCJpYXQiOjE3NDk2Mjg1NjEsImp0aSI6IjQ1YzQyMmY3LTcwNTMtNGFiNy05M2IxLWU3NjljY2I3YzI3NiIsInVzZXJuYW1lIjoiNGZhOWIyNWItMWZkMy00YzBlLWI3Y2YtYWY5NzU0Nzk2MTljIn0.j0Mq9o6TW13cBJWwEzbVkozheqlNhJDblyzYDzS1OEVC_FilLcuQ9Vjr3B1kGedEuQ-noBg4-EMAoiXB9gcQCJO8prc13S6iyI4jyi_Z4LQwYlI9c1UriZjXRiB9l5WeRxjX-bQMqdclG0FVDirRrc-nqcEoVVBMLOIM66sj11dDCfUkDEj8k4TotIw0Rklc6Sw-tRtPTWCgkZ7PFo_7NE5t0X3Tg5ZdEaCejho3Bw9PpnDUkU5aWotLHSk2CgHMHYmhPpgFkA0tH74jsb9YieQk-EYgQA-K0yCma6vo19CVESwIJhVN3Q1o9ITZcYZ0gWM5laqaMOQzE57pCp1m5g",
        },
        queryStringParameters: {
            readType: "guest",
        }
    }));
}

get();