import { handler } from "../../functions/PropertyHandler/index.js";

async function main() {
  const result = await handler({
    httpMethod: "GET",
    resource: "/property/bookingEngine/{subResource}",
    pathParameters: {
      subResource: "all",
    },
    queryStringParameters: {
      type: "Boat",
      bookingId: "9566261c-99d7-4b3a-af08-ad8bb9721d94"
    },
    headers: {
      Authorization: "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmMDg5OTlkMy02OTdjLTQ0YTAtYjM4OC1hNDE0MTc4ZDRjNWIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6IjJjNGJjZDQ4LWQzNzctNGI5MC05NWU3LTI4ZjQ2MDBiOTIxZCIsImV2ZW50X2lkIjoiMDQwYWJmMzgtOTQ2OS00MzU2LTkzNDgtOTY4YWY3NTczNzNjIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc1NzQ4OTM2MiwiZXhwIjoxNzU3NTAyMzAwLCJpYXQiOjE3NTc0OTg3MDAsImp0aSI6ImM1NTIxMWIxLTJhMTEtNDM2Yi1hZjA0LTQwMjIyMzViZTU3MiIsInVzZXJuYW1lIjoiZjA4OTk5ZDMtNjk3Yy00NGEwLWIzODgtYTQxNDE3OGQ0YzViIn0.ozrEr-29s5UCRPvpJBLy9yAYjgYiVKJn6vI8S5WYgg5tQjCl0j4hufLaRnaNb4VoUcyHRCj13kTLEwRNrQdPgMZ1lVDnGCZ88_xtxiFrIOKMNTavMk10lL7AMpgM7rTib9TrrlL_9sAwlh-1mq3kLfo2AEv--QG9sY0hd9cAKxdjvTK9UWrNGhKkm0lSXqFT-DTL98Eb4szUS67K5MyhU9iJHjoHSytWEwv-UXJRBy6FSkbji1cO17xC20WxeZUwJcxAmZJiJ7PUOdqThGVq5N6lYKi3zrDp9nH74AVBT5-ooEmj22Mtv6RSmvY1sTnOHFmi31wGjVCJn_gWjGrqeA"
    },
  });
  console.log(JSON.parse(result.body).properties)
}

main();