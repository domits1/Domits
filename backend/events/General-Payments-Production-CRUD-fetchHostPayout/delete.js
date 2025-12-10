import { handler } from "../../functions/General-Payments-Production-CRUD-fetchHostPayout/index.js";
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function performDelete() {
  console.log(
    await handler({
      httpMethod: "DELETE",
      path: "/delete-user-bank-account",
      resource: "/delete-user-bank-account",
      headers: {
        Authorization:
          "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIzMDQ4ODNkNC0xZTBjLTRjMGUtYTNkMy0zMDdkZTE3MDAzMzciLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6ImNiMDc1Y2NlLTMyN2QtNDRhYS04NDUyLWMwMzE3NzQzOWFmMiIsImV2ZW50X2lkIjoiNmNhMjZiMDYtZThmNC00ZjczLThkNTYtYTFlMTA1NThlNGM3IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc2NDA2MTU4OCwiZXhwIjoxNzY1MjA4ODUxLCJpYXQiOjE3NjUyMDUyNTEsImp0aSI6IjFiMjc4M2I2LTIwZjctNGJhMS04ODdhLTNmYWJkNmI2YzA4YSIsInVzZXJuYW1lIjoiMzA0ODgzZDQtMWUwYy00YzBlLWEzZDMtMzA3ZGUxNzAwMzM3In0.g61mzdWhOrxrESSWtx1MTIPzI_MId54vg-2MXlnYXlliGXpcnWs8iP51MgyWHQTIPtElQ4cvK9f3H7hbooOzrp_SESPv8ExpAe2l_6F1LmDqPuynPzbnmRazyiSEi-24GpMKfXchVxPGSlBCzKAp0idy5HYa-oDFXg8FIvT5R8FSItOQYGgvqWvcvuZtd9vUcVJeS5DHs9fyTuxnwyJOhcxQXCFkxjFG0oO4ErsxK7I5v5IEefyuyC_hxJUh31W3PRpUabc7ckaBVNTXBZ1tD6pK4rorTJTF5yl2VqbNXopHTL1lxDPqmOHVp8FXZ-tNRMgr4wZdRdOdFIwcC847rA",
      },
      body: JSON.stringify({
        bankAccountId: "ba_1Sc44NK6sCPMBRTyKChlhSfv",
      }),
    })
  );
}

performDelete();