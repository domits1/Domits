import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.mjs"
async function get(){
    console.log(await handler({
        httpMethod: "GET",
        readType: "propertyId",
        resource: "/bookings",
        path: "/bookings",
        headers: {
            Authorization: "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJjZTkzZjM3Ny05YWMwLTQ2YzItOWQ0NS1jZjIwZDMzZGNjMzMiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6IjRiNDg3MWI5LWY3MWEtNDA3NS1iMDFiLWYxY2E0NTZhMjZlZCIsImV2ZW50X2lkIjoiNWJiMzczODQtZWI1MC00NzFiLWE0NjctODY2YjJlYTcxYTMyIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc0ODg2NTYyOSwiZXhwIjoxNzQ4OTUyNjM5LCJpYXQiOjE3NDg5NDkwMzksImp0aSI6IjNmZWI4ZTBjLWNmMzYtNDZkNi1hOWEwLWFkN2M2ZWE0NTU4NyIsInVzZXJuYW1lIjoiY2U5M2YzNzctOWFjMC00NmMyLTlkNDUtY2YyMGQzM2RjYzMzIn0.OT3wUavrIuD7EyJIaAnmSVoxh__3Vp43gfB2G9DoprWu647p-3yvmejJVj4JmZy-hnmlCYsIcgJ_p8DEOjnZbnm6Pd8wTnWwObex2goIdFsiw7Xg1XwDxMVNilZNFvvaEFdZ6nxhTpW2R1rN_LQI6AJJOLzqOljzQ4ltsykw3hc8d5iYGhrbdFY_f38GhiFHLmfA0f5ksueYZ-1NExFAiyCFlfkDLG9Bi0bSvlq1-_ibiPDKwCAZVG5mqK9Ii3MB23R74FT7hy6j9dFinaem9kCZ-CgEUsw-X_pcdChTucDhfE9YCBmzRdvjWTSeGtV5DWFaTYlKPA5LnosZI7Ak3A",
        },
        queryStringParameters: {
            readType: "hostId",
        }
    }));
}

get();