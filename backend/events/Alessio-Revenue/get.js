import { handler } from "../../functions/Alessio-Revenue/index.js";

async function main() {
  console.log(
    await handler({
      httpMethod: "GET",
      headers: {
        Authorization:
          "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmMDg5OTlkMy02OTdjLTQ0YTAtYjM4OC1hNDE0MTc4ZDRjNWIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6IjY3OTliNjIwLWZmZjgtNDlmMi1iNTZhLWUyZTJhYjJhZWViYyIsImV2ZW50X2lkIjoiMzAyYTVjNTMtNGViZi00Zjk4LWE2M2EtYTJmY2FmNzdhMmRkIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc2MDUxMjIxNSwiZXhwIjoxNzYwNTMzOTgxLCJpYXQiOjE3NjA1MzAzODEsImp0aSI6IjBhMGZiZmQ2LTFhODUtNDUzOS1hYjNhLWZmYTE1NjA1NGQwMiIsInVzZXJuYW1lIjoiZjA4OTk5ZDMtNjk3Yy00NGEwLWIzODgtYTQxNDE3OGQ0YzViIn0.KNZ2moZQNGgFQhUsCaVa3_YSrbDd7FTR1nvWmNNKcIX5V0zFYo93Tw4-dVCYLEa7Acb6tLVms1o3K96ugg_ZEZk-p9QDSusVvYhfVUApBfadQBa1nfdqsH2IfcSyCY58HvUJPIH6iMH1a5m4YZQCgV4MZU_2-18si8NJEjQTqxi_mStJyJ4rhQqZjygYH2ziF8qjqxCk2E9G1d_DJgk-SHzsKiSoV01kSR4Yskf6NsCmEhzzgpclvbMOPovaAktF4YgGpx3NInEHAieOcVDokCVNGbXXJkfJYAaatKcXplAE-QxkV3ZKb4VuF0hWlPa_cHgkFN4xZBj9mKKlDlKwiA",
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
