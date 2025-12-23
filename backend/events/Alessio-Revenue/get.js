import { handler } from "../../functions/Alessio-Revenue/index.js";

async function main() {
  console.log(
    await handler({
      httpMethod: "GET",
      headers: {
        Authorization:
          "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmMDg5OTlkMy02OTdjLTQ0YTAtYjM4OC1hNDE0MTc4ZDRjNWIiLCJkZXZpY2Vfa2V5IjoiZXUtbm9ydGgtMV9hMWJlNmI1OS0xZjFmLTRiNzItOTMxZS1lOGNlZmY3NTI1ZDIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6IjkxYWM0Nzc3LTM3MzEtNDQxYi1iMmZhLWIxNTgyYjIyNTA2NCIsImV2ZW50X2lkIjoiMTc5Y2I5MzctNTIxMi00NDFhLWE3ZjgtNWY2YzQ4NmUxMjdlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc2NTM1NTMzOSwiZXhwIjoxNzY1MzU4OTQyLCJpYXQiOjE3NjUzNTUzNDIsImp0aSI6IjdhYjg4NDY4LTUzM2UtNDJlZC04OWEyLTk2OWM4ZGMyZGRmMCIsInVzZXJuYW1lIjoiZjA4OTk5ZDMtNjk3Yy00NGEwLWIzODgtYTQxNDE3OGQ0YzViIn0.mHvcMxkSvj_h2u09886QOOfw9yJRXYS9NHGPCkNXgS83sNcuSl1IhPyvbcmmQbGdZdc4pOdxLAt0gHn17vycPVjz0ntP7tnSFnm-XMGzjHcsy95DKsV44oI9SotRsJJ-OKtG3fhBlTkuWGuaJ0kNOK3p52sGk0SJKLXwL5V_ZIvwVNSYp28vvUyH2aRNfhZk6saLnWlQHdm9ZilE6_E-Ib1-zAME3OHY0YdkZMSkJkKnA7V9CkGc429eN6G2y9bdMmTpWbFxQ2BgsqH6y8h-7-0TlbQV91AoCZOhURYQo8nsOBDyVz7iibgbzxX2Zz6bfgltzQy5tIZuxajUAnwsAg",
      },
      body: {
        hostId: "",
      },
      queryStringParameters: {
        metric: "averageLengthOfStay",
        filterType: "monthly",
      },
    })
  );
}

main();
