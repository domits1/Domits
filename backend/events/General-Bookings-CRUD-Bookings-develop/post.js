import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.js"
import { getAuthToken } from "../../test/util/getAuthToken.js";
async function post(){
    console.log(await handler({
        resource: "/bookings",
        path: "/bookings",
        httpMethod: "POST",
        headers: {
            Authorization: "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIwZjVjYzE1OS1jOGIyLTQ4ZjMtYmY3NS0xMTRhMTBhMWQ2YjMiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6IjMwNGU0NTgzLTgxY2QtNDRhNC05YjNiLTgwNjM2N2UyZTBlNiIsImV2ZW50X2lkIjoiNGY4NzBmNGItNzNkOC00YzE3LWI1NzYtMTUzZDFiZWM3MjhlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc0ODMzMDM1NiwiZXhwIjoxNzQ4OTQyMjIyLCJpYXQiOjE3NDg5Mzg2MjIsImp0aSI6ImM4NmUzNDhhLWRhYjYtNGRlZC05MjZiLWExYmY0YWMxZmFjMSIsInVzZXJuYW1lIjoiMGY1Y2MxNTktYzhiMi00OGYzLWJmNzUtMTE0YTEwYTFkNmIzIn0.OyYC4gGyRoZrHyoBm2fE9IL0pk2mQS7L6ytr2ILWeyI8V9Xod1yhmsla3I9SWcrc-MmZquxd4HHydjRXqQDe3Jq1Y2EEqeOZdzva0RkxRR8nYnP5VWSRprxVvgFQfL8iPpJ1wSC82F8qsAZHewpoMmbZwSd_er8US0l7q9BhZfxgYvzqIGpt8iv0HsW2YSzvmM4a3aZQx6vt10hBBshiuGJygx6XCGNmmN75ro7bM_5xygdXYSztxjHqvpjjLnf4Ajq2NGRfkD17-ATWHPbX8Zy35auhkuqsEdqVx8lf2lz8BE_m9h-1SzOGsWRIDNMFYa8RPYxDikRY7vw8FiHPFA",
        },
        body:{
        "identifiers": {
            "property_Id": "6637379f-efe4-4a13-b3ec-092f2dacee70"
        },
        "general": {
            "guests": 1,
            "arrivalDate": 1747094400000,   
            "departureDate": 1747180800000
        }
        } 
    }));
}

post();