import { handler } from "../../functions/Alessio-Revenue/index.js";

async function main() {
  console.log(
    await handler({
      httpMethod: "GET",
      headers: {
        Authorization:
          "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmMDg5OTlkMy02OTdjLTQ0YTAtYjM4OC1hNDE0MTc4ZDRjNWIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6IjgxZmQ3OGVjLTIwNDMtNDYxZC05ZWI2LTM3ZDA2YTYzZjIzNiIsImV2ZW50X2lkIjoiNTI2OTM2NDktNzlhYi00MmQxLWFmNDYtZDQzZDhlNGExNjVkIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc1ODEwMjMwNiwiZXhwIjoxNzU5NDEzNTQ0LCJpYXQiOjE3NTk0MDk5NDQsImp0aSI6Ijk1ZDVhM2ViLTc3NzMtNDU2Zi1iODlmLTZjM2ExZjE0MWUyNSIsInVzZXJuYW1lIjoiZjA4OTk5ZDMtNjk3Yy00NGEwLWIzODgtYTQxNDE3OGQ0YzViIn0.hjsCwOwKhgWvUGAcbtU1LKvRBEgzEF9TicCcPG1k72nVCQU2-6lMEKRBcjjibftkpF9la8Cj4lc5AXdO-9yTRwJPHr_5orKR2d2vGzENaRVi4neiU6tjnRKSVvbJ2Zv0TuBPvUrq4EybjeSPUaFy38ACifmUw3frL_aBqQKnX0u3WzfF6qC3ZRkyvHn1Jss7Q2Iq6UelvDBWx4rkdiHx3c2YuySbZarUXdCwwmxuXC-0_oPaDgqHkhSFiLyTUt5CuvvLUUIN2Zb_BkS5U5KyXohNRZsaOua7G4ySIwWBQF3sZmurWR9a6Qls2IcZvHMfOaC_LCj_l23YMbvPquuuGg",
      },
      body: {
        hostId: "",
      },
      queryStringParameters: {
        metric: "revenuePerAvailableRoom",
      },
    })
  );
}

main();
