import { handler } from "../../functions/Alessio-Revenue/index.js";

async function main() {
  console.log(
    await handler({
      httpMethod: "GET",
      headers: {
        Authorization:
          "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmMDg5OTlkMy02OTdjLTQ0YTAtYjM4OC1hNDE0MTc4ZDRjNWIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6IjY3OTliNjIwLWZmZjgtNDlmMi1iNTZhLWUyZTJhYjJhZWViYyIsImV2ZW50X2lkIjoiMzAyYTVjNTMtNGViZi00Zjk4LWE2M2EtYTJmY2FmNzdhMmRkIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc2MDUxMjIxNSwiZXhwIjoxNzYwNTM4MDg1LCJpYXQiOjE3NjA1MzQ0ODUsImp0aSI6IjJhNDg0MjBkLTU0MWMtNGEzNC04NDEwLTMzZGI2MWNkMGI3NyIsInVzZXJuYW1lIjoiZjA4OTk5ZDMtNjk3Yy00NGEwLWIzODgtYTQxNDE3OGQ0YzViIn0.eK9M7Fp49zG7cCxJ46tXG45vUvLfiolJ-KDkDktg_TpUT9zfj4niWKKYj1hytYbsFx13IfjLJ3IZhRKlSkLMGJrD9akQIXuPsrMbBYlzwLOr8OfH2TxDzH5iYtkwTfG770etbLzhmxt09jcUXA5mfCXnUgq92vNRiXfsZ9cNiP_Fcf4-oE7hH7RYczsbjSuH8Phk-f1rqfcx6NelTFNbKbsvXlTaX--Twaniy5AARgLDsYWfFzMKJ6ce8zAqYBbzplE6_9kUbh9AXeIb1RwILkwrp9pAXMCuwx7B056bkx0YCL2vYTdOS9Sr1b8R4kbB12Yh2AdS2BBg76a190e9HQ",
      },
      body: {
        hostId: "",
      },
      queryStringParameters: {
        metric: "revenue",
        filterType: "monthly",
      },
    })
  );
}

main();
