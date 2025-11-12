import { handler } from "../../functions/Alessio-Revenue/index.js";

async function main() {
  console.log(
    await handler({
      httpMethod: "GET",
      headers: {
        Authorization:
          "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmMDg5OTlkMy02OTdjLTQ0YTAtYjM4OC1hNDE0MTc4ZDRjNWIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6IjE3Y2Q0YTc2LWZiZWYtNGI1NC04ZmQyLTFhNjhmZmMyMTA0MSIsImV2ZW50X2lkIjoiN2UzMzQxMzgtN2VhMy00ZmU0LTkxZmMtMWI3MTgyYzI4ZjM5IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc2MjkzOTAwMCwiZXhwIjoxNzYyOTU2NDcwLCJpYXQiOjE3NjI5NTI4NzAsImp0aSI6IjgyNmQyOWIwLTEyYjUtNDc1NC05ZTdkLTFiN2M2ZDllYWIxMSIsInVzZXJuYW1lIjoiZjA4OTk5ZDMtNjk3Yy00NGEwLWIzODgtYTQxNDE3OGQ0YzViIn0.nAQKJNMSijxCvzi9VqHi0k7AhrflSVzZgAtJG9PHP2oEywa_J-tXUiAwZ9cuuoARl7gcoEBEpXyUhPNa0RVjz4udYbzzd1Qec4kIaheb6sX2BY6EH6nEipNKU9l9HxmAg2uNfFgTZaKnIhYDlqPGitCLm7bAb5smviqJrzzx17FzcZ_4cTI_WKttU3OxBy9JxYFUujBrRtKWXyAc2riFpbngoNuEDRo68S06IEBkznMnVWattI7qFYC_qZu3bDlC92oDUxoKx1rIcj-f7N1QiHuPwsTvJrCt96L0znST7NKlRj1N_l2v90ntbBYrdydgyEvtlEIpjMtQfYDz2zpVOA",
      },
      body: {
        hostId: "",
      },
      queryStringParameters: {
        metric: "occupancyRate",
        filterType: "",
      },
    })
  );
}

main();
