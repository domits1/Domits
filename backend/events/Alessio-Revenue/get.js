import { handler } from "../../functions/Alessio-Revenue/index.js";

async function main() {
  console.log(
    await handler({
      httpMethod: "GET",
      headers: {
        Authorization:
          "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmMDg5OTlkMy02OTdjLTQ0YTAtYjM4OC1hNDE0MTc4ZDRjNWIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6IjE3Y2Q0YTc2LWZiZWYtNGI1NC04ZmQyLTFhNjhmZmMyMTA0MSIsImV2ZW50X2lkIjoiN2UzMzQxMzgtN2VhMy00ZmU0LTkxZmMtMWI3MTgyYzI4ZjM5IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc2MjkzOTAwMCwiZXhwIjoxNzY0MTU4MDE5LCJpYXQiOjE3NjQxNTQ0MTksImp0aSI6IjJlOWI1MTI5LThlMDAtNGNlYy04YTk2LTQxNzIzYWQ5ZDlhNiIsInVzZXJuYW1lIjoiZjA4OTk5ZDMtNjk3Yy00NGEwLWIzODgtYTQxNDE3OGQ0YzViIn0.Gho3YC_n8LMquJwliwg0S3v4YluTfjMA5yXHM0u0RUVG4VETs405AH2X0AYG6RKyHpPX5cUjRRdB3V9_nOPPmwUzG1NcYOWijbL2VFnM73dkpV5lqRpDvz-zqIjfQSdG7MDImHf-V04icjMq1nlO8SmRK4O_u2NtihmEicbgmcyJOB7unzAvsAZwwxhL64fONk_nH0HkxmTbDaSITAlDeE9VSGAPCAw0aOAF3VViVpoRQPBiCyow_X7zEgHCa7DD8xlV60nqKWXlJ5TJXROR78WUTjRPSI67wGUQ24HJFN1Jq4hLy22PVqf6Bk1BJSQkB63fnHKbzBqfojmMsrVl7w",
      },
      body: {
        hostId: "",
      },
      queryStringParameters: {
        metric: "revenue",
        filterType: "",
      },
    })
  );
}

main();
