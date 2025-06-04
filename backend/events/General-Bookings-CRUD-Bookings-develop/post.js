import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.mjs"
async function post(){
    console.log(await handler({
        resource: "/bookings",
        path: "/bookings",
        httpMethod: "POST",
        headers: {
            Authorization: "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI0ZmE5YjI1Yi0xZmQzLTRjMGUtYjdjZi1hZjk3NTQ3OTYxOWMiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6ImZlYTliMDkwLTlkZmMtNGMyYS1hZTcyLWU3ZTNiZGY2YTY3OCIsImV2ZW50X2lkIjoiNWI4ZWM0YjAtMzJhYS00ZTY3LWE5YjgtMjljOTU1MDRmY2NkIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc0OTAzMjU0NCwiZXhwIjoxNzQ5MDM2MTQ1LCJpYXQiOjE3NDkwMzI1NDUsImp0aSI6IjUzNmU2NWY5LWMyZjAtNGE0Ni1iNmZmLWMyNWJmZGU4YjQxMyIsInVzZXJuYW1lIjoiNGZhOWIyNWItMWZkMy00YzBlLWI3Y2YtYWY5NzU0Nzk2MTljIn0.npd-xF-3n-eAHrboDe1zov9Me_FX_17FsFFt1eGtvz_UOszulM6-RbgRiJfA6q9-k_aFuOyhvsblsVSDmdBDTg1vDrfBUqLjCmKoL-5ZNKlJnHOxENcXovebfti96JbntS7Vg-wXnwPLVqS7Kjnew_ivVt2uRMeVtnPFrbsqFVJWRN-7Ld9xRI1-z1lOqbZQTDT6Z202PmnBn8iGUt5LfZrz8Fe9roVhmoq6tcnfPQXHO3Kq42Ev6gBnku6seaI4-XxB-KFQXQbgx65ArnmJ52M3Fgzy3NVpz0Q07sM7UdZ2BavSqQDH1kRyDi3wHdKCsrnGckBltDMMBMQoXin2TQ"
        },
        body: {
            identifiers: {
                property_Id: "a9bba419-5e1b-4d4a-b86d-1e22c57ca24e"
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