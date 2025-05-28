// TODO Create your own post event to your handler function.
import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.mjs"
async function post(){
    console.log(await handler({
        resource: "/bookings",
        path: "/bookings",
        httpMethod: "POST",
        headers: {
            Authorization: "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIwZjVjYzE1OS1jOGIyLTQ4ZjMtYmY3NS0xMTRhMTBhMWQ2YjMiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6Ijk1YzQ4MTJkLTY5NjYtNDAyZi05MTQ0LThmZjVmYmNmYmE4NCIsImV2ZW50X2lkIjoiMDE0ZjM3MTQtNjM2Ni00Yjk1LTg4YTEtYjk5ZDFlMzM3MjQ0IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc0ODQyOTU0NiwiZXhwIjoxNzQ4NDM0MzgyLCJpYXQiOjE3NDg0MzA3ODMsImp0aSI6Ijc4NDI3NGJhLWIzNWMtNGYyZC05MGZlLWFhZTYwMGI1NGE1NyIsInVzZXJuYW1lIjoiMGY1Y2MxNTktYzhiMi00OGYzLWJmNzUtMTE0YTEwYTFkNmIzIn0.j4hzbStzmva5pELX6TWRnNaSumuu5Uh4P1khox4oi3FDvpIfasJkyWn3P5jQZFVuD0d6ak7C6_G99TB1hKoNRIEfbltSbvWTq-htpTq6uPfhxd02PROaNvVbyvx4yO5eLULQlU53R9uG_SsQlzauIABRvSCN9UNF0NZIXgssMxaoTS9oZw2oQvCmcPEa2NhNLZ1a02Jvy3DFajGSijBoc7mpKkpzRVZ7hmI2lqkp-M8IcmuFxKRgpIns_Bvps5K3LDj36O6vNcyi8Yz4VA2fsSfW8J1IsJiwkMcS9ZqiFtuxY5eg81qfeH3QzzD5iwK3rz4zwNUwnWtTzUxS3MuDdQ"
        },
        body: {
            identifiers: {
                property_Id: "6637379f-efe4-4a13-b3ec-092f2dacee70"
            },
            general: {
                guests: 1,
                arrivalDate: 1747094400000,
                departureDate: 1747180800000
            }
        }
    }));
}

post();