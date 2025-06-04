import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.mjs"
async function post(){
    console.log(await handler({
        resource: "/bookings",
        path: "/bookings",
        httpMethod: "POST",
        headers: {
            Authorization: "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI0ZmE5YjI1Yi0xZmQzLTRjMGUtYjdjZi1hZjk3NTQ3OTYxOWMiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6IjY0MTYxMTMyLTk4OTEtNDIyNS1iYjQ3LTZmZWMzM2Q2Zjk4MiIsImV2ZW50X2lkIjoiZmEzOGRmMmYtYTkwZS00OTA1LWEzNjgtNDhkZmRiOTNhOWE0IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc0OTAzNjQzMywiZXhwIjoxNzQ5MDQwMDM1LCJpYXQiOjE3NDkwMzY0MzUsImp0aSI6IjY0NmVhNTRjLWIyOTQtNDBhZi05YjlmLWRhMzhlYmFiNDAzMyIsInVzZXJuYW1lIjoiNGZhOWIyNWItMWZkMy00YzBlLWI3Y2YtYWY5NzU0Nzk2MTljIn0.KXSPWM8OEo2UYvHv90Pbz1IAdPHDoRv8ingh-euZzbchuWWkw292x4I5VnkrqrwCFJd9TGHSKOubPyXUmrUqiD-gmK0WHbK8DXebek5O1tRTBEKOAbllwUabxrfsTygC-vaUhWUE7cuGbnfvt5Qmt-RZR5lhFHmwZyZE-cYABb0TfJKXzo7OXQAAUD43rLbgpt2qzAVQ_mY1rJIYJfQwNXa5g-a3eZb0dAnl6YpZNpqYV6xhmQjLN_wc_kaNs3LoYnBqD0WFZHFEsO20sumGB8LLvI8RozXegtXPtXlX-QXc5E1Bn4nMV6woZursrs2E9VDqBwlYLxc99_77VewUMg"
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