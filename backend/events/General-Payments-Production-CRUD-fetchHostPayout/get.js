import { handler } from "../../functions/General-Payments-Production-CRUD-fetchHostPayout/index.js";
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function get() {
  console.log(
    await handler({
      httpMethod: "GET",
      path: "/retrieve-user-payouts",
      resource: "/retrieve-user-payouts",
      headers: {
        Authorization:
          "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmMDg5OTlkMy02OTdjLTQ0YTAtYjM4OC1hNDE0MTc4ZDRjNWIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6IjI5OWIzZTViLWZjNjgtNGU1MS1hY2ZmLWZmMWIwOGRlYTA3YSIsImV2ZW50X2lkIjoiYmI3MDBhNmEtZGNjMi00Y2I4LWI1MDYtMjZkNmI0ODQzYzgxIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc1ODU0MDQ0NywiZXhwIjoxNzU5MzA4NDQyLCJpYXQiOjE3NTkzMDQ4NDIsImp0aSI6IjdjZmJmMDJlLWJjY2ItNDQ5Yi1iYTZmLTlkNDUyMTllZTZmOSIsInVzZXJuYW1lIjoiZjA4OTk5ZDMtNjk3Yy00NGEwLWIzODgtYTQxNDE3OGQ0YzViIn0.IGS9n8evFqtfA_5Dw73cfI8kk2PgbUZJCXwZQuDKyxFMettlkLf-ukZ34CaL-9caLiQLrSptjIaT32Hf26keQyllebQiubrueaaVzBA78m20__CptTV66BGlRAB1jOKw8h-AzcOkGg0WkpdvI__KjTfEcLloQ2lnED5yn02TTgzrIGhJf-E1ckHExMHpnvo-0LJPLqXs3cBBhha5UVTnfhLB8SA3s6nE-_UWncERKpKhQLDatmMe9ndqszsxoIznBP-tMnAip9mRD5sTZMYzNr0eORl2wJSuG-rN0ktvwg1EL3xbPoJdD4xWGRjDtez8yqJhHDMDF7y1_wVuRdOpMQ",
      },
    })
  );
}

get();
