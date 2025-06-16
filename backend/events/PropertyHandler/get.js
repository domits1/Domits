import { handler } from "../../functions/PropertyHandler/index.js";

async function main() {
  console.log(await handler({
    httpMethod: "GET",
    resource: "/property/bookingEngine/{subResource}",
    pathParameters: {
      subResource: "all",
    },
    queryStringParameters: {
      bookingId: "9566261c-99d7-4b3a-af08-ad8bb9721d94"
    },
    headers: {
      Authorization: "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI0ZTEzYzI1MS1hM2NkLTQ5NTItYjMwOC1lMzU3MmIwYjFlNmIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6IjNjNDA0Mzc2LTM3OGEtNGQzNy1iZGEzLTkzYTg3NTZkZDE1MyIsImV2ZW50X2lkIjoiNjIwZjU3NjYtYTJiNC00NGRiLTgxOTktZDA2Y2IxMTZjOTkwIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc0OTgyOTkyNywiZXhwIjoxNzQ5ODMzNTM1LCJpYXQiOjE3NDk4Mjk5MzUsImp0aSI6IjE0OTE3YThjLThiMTktNGY1My1hNzIzLTE1OWVkY2Q2ZGUwZSIsInVzZXJuYW1lIjoiNGUxM2MyNTEtYTNjZC00OTUyLWIzMDgtZTM1NzJiMGIxZTZiIn0.p2ZXTjEiO_snBxtrPmz6JQIvzT84Z_dGneGzTONBhqL0bXkBz1ZFsC2jWvvgkgnOdYLWs7f_ivSxL00t7Q_uZbrGIivVcWVU8Ud2uc3VqsSNvRZ-CfvGIu-4cZ5YA8Jfu5UbFfu058-C5cpJdCsjuGoa70YeSUeouYZrPRId7b3ydEqGnqAtElnjy9oED0IlD6Tfe4fsR14vjrkL2qlVFD7KyYUyRM6CA8-GBrsII41JxdZBdqkaNh52J1VDCFmS-3um1GRWrxT9Am-cYwgcrBEV8Lea11n_2HA978qwN4n30Eosm4aCAHiWzrQn8LkXi7629Gubdm3wuu2VlKernA"
    },
  }));
}

main();