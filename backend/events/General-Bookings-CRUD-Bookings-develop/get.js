// TODO Create your own get event to your handler function.
import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.mjs"
async function get(){
    console.log(await handler({
        httpMethod: "GET",
        readType: "propertyId",
        resource: "/bookings",
        path: "/bookings",
        headers: {
            Authorization: "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIwZjVjYzE1OS1jOGIyLTQ4ZjMtYmY3NS0xMTRhMTBhMWQ2YjMiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6IjMwNGU0NTgzLTgxY2QtNDRhNC05YjNiLTgwNjM2N2UyZTBlNiIsImV2ZW50X2lkIjoiNGY4NzBmNGItNzNkOC00YzE3LWI1NzYtMTUzZDFiZWM3MjhlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc0ODMzMDM1NiwiZXhwIjoxNzQ4NDM4NDg5LCJpYXQiOjE3NDg0MzQ4ODksImp0aSI6IjU2ZDY3M2Y3LWEyMzItNDRmNC05MTg0LTg1ZWVlNTcxMDVmYyIsInVzZXJuYW1lIjoiMGY1Y2MxNTktYzhiMi00OGYzLWJmNzUtMTE0YTEwYTFkNmIzIn0.dJ4Tm1VQV7Qdmgp2mqLWPLcxC1OwfUudAKL5BYlgZqSUyIU3IptSbcuas_76mc04Cw3Z1kb8_Ua0Q4hLuo2eNZVpVgNc6DEXuwFbmDPlo7pBV_Ww-eKyV558NT2JkfG_V_vyIeZha6O1Iyj_aQgkK5s6D7NJzRQZkITyTMAEboTpoKM-z219AmCERPdqrRdqlQqiGJjR7pYx9vfghN7uL_KULQJOKRWD_WjX_2_NgKMTrLp_nlgguZimlewjde6org8KTXSg8hPiYD4bRq4HhEZmdF4lQfC4YZgbR0nt_HLXopFCHvM5witaaJQFb5w38IazNvB1oSMrbduvEDjsRw",
        },
        queryStringParameters: {
            readType: "hostId",
        }
    }));
}

get();