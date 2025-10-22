import { handler } from "../../functions/Alessio-Revenue/index.js";

async function main() {
  console.log(
    await handler({
      httpMethod: "GET",
      headers: {
        Authorization:
          "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmMDg5OTlkMy02OTdjLTQ0YTAtYjM4OC1hNDE0MTc4ZDRjNWIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6IjgyYWYyMWYxLTgzN2QtNDMxNy1hYzM4LTEyYTRjZDM0YjhkZiIsImV2ZW50X2lkIjoiOWRlNGYwZTUtMGVkYS00NTY5LTljYTUtYjIxMDBhODY2OTBlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc2MTAzMjg2OCwiZXhwIjoxNzYxMTE5NTg4LCJpYXQiOjE3NjExMTU5ODgsImp0aSI6ImRkMzhkOWZjLTZiZTEtNDBhZC05ZWZmLWNiODY5NjRiZWE3YSIsInVzZXJuYW1lIjoiZjA4OTk5ZDMtNjk3Yy00NGEwLWIzODgtYTQxNDE3OGQ0YzViIn0.KLZYF_CK7GewbbCbz_d_WBD7v-HTKAHuGT6aA6yI2YvEnWBREXaYGnllPeHizy4NV_b_MLegZcbtniFM4EIDh9xsujowTf74jM8qQUNK_sz01iOJTe3z6pBEfI3TZxHSxm0RvNJ_taYbveCgx-7HMvEaxpYrtWfG4ke36Z3s-140om-OnLXOGHSH_5tUix7bkm7_PF8jxHriIhh0ALeHsvlxuz8kMpDjVuAMEw9ElCKJsfWk2xYkiVIpSevsq98HdKZowlkbaWR8_yP0SyP2HrpQmslpkn7nxNbvjmP3ORlMqwA6q3yyf2wLTOyn0gDixDhBhjS4-wUI4KxKVeKkXg",
      },
      body: {
        hostId: "",
      },
      queryStringParameters: {
        metric: "propertyCount",
        filterType: "weekly",
      },
    })
  );
}

main();
