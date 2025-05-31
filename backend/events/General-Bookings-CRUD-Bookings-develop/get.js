import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.mjs"
async function get(){
    console.log(await handler({
        httpMethod: "GET",
        readType: "propertyId",
        resource: "/bookings",
        path: "/bookings",
        headers: {
            Authorization: "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIwZjVjYzE1OS1jOGIyLTQ4ZjMtYmY3NS0xMTRhMTBhMWQ2YjMiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6IjMwNGU0NTgzLTgxY2QtNDRhNC05YjNiLTgwNjM2N2UyZTBlNiIsImV2ZW50X2lkIjoiNGY4NzBmNGItNzNkOC00YzE3LWI1NzYtMTUzZDFiZWM3MjhlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc0ODMzMDM1NiwiZXhwIjoxNzQ4NDQ1MDQ1LCJpYXQiOjE3NDg0NDE0NDUsImp0aSI6ImY2MGYyNWYyLWRhODctNDllMC1hNjM5LTM3MDU2OTdjOGUwZiIsInVzZXJuYW1lIjoiMGY1Y2MxNTktYzhiMi00OGYzLWJmNzUtMTE0YTEwYTFkNmIzIn0.qDxgz3VSoC3NNJSAEK7hg34-6ajK6y-Rd2GMV_6ewQyVPNdLRCADaKRbvcUCEz5Be5T1WoOCYUXDqcRHaHnnfITjibErSTyIcedGug202f-gjxuWbOAC4pwOf00tLJYB7smB7ob-nSONheCvMSQfarH3zHUq9YbluPXaik378sYBr1JUDSXrquNfA7WAZqBgN9M14LMY7FKcwvPgcv1rQwIVMvEljGbK6m74wftpCrv-PAOPiXidV4-aKCuIgz-RpUgw8tpcmGOnGkvsR2uexZ0cRtlwY_1EfljPAdEBqHEvMh_SQlmgSvugk49KmYzgX3ONGNke8b_l4xss62iLag",
        },
        queryStringParameters: {
            readType: "hostId",
        }
    }));
}

get();