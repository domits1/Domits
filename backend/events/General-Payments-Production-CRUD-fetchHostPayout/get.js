import { handler } from "../../functions/General-Payments-Production-CRUD-fetchHostPayout/index.js";
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function get() {
  console.log(
    await handler({
      httpMethod: "GET",
      path: "/retrieve-user-pending-amount", // Change to "/retrieve-user-payouts" to test payouts
      resource: "/retrieve-user-payouts",
      headers: {
        Authorization:
          "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmMDg5OTlkMy02OTdjLTQ0YTAtYjM4OC1hNDE0MTc4ZDRjNWIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6ImU5YzliNDljLThjMGMtNGFlZi1hNTY1LWI3MmYzYmZmMzgwNSIsImV2ZW50X2lkIjoiY2Y4OWZhMmYtODA3OS00Yzc2LWEwMzUtODM5YzgyZTVkMDNmIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc2MTEzOTY2NSwiZXhwIjoxNzYxNTgyMzMwLCJpYXQiOjE3NjE1Nzg3MzAsImp0aSI6IjUyYzQxY2FmLTNjYjctNDJmNC04NDg4LTM2ZTQ2NWRlODYwOSIsInVzZXJuYW1lIjoiZjA4OTk5ZDMtNjk3Yy00NGEwLWIzODgtYTQxNDE3OGQ0YzViIn0.bgj26_TcvCBSIKQnNdEfzGCyWQCcXrriVReZnnD7oGIRkw8zluTyXSmLeRob8tGSe6pI-zLsdVW5o24yQDysWvTeUECIuZFpjcx0URCCig5Mu0UpIHnyiA4TcWbT0kL_bpWiAZFN_wixoIG5R897hxiH6NAo7t_q0OxHzhDRY6wo6RiGVH_pN2C_m86B17MyObmKJy2f9uu6JsEZFpNv8E6Q45eTOqDI_Km-ZV6nUZEP8vr_hhY48VJv0XpHynXqCWvwusyHsEiQ4H5hkZjjc85jta2UiV3OAiGGycqdmsYAi2Twnn7XZYsDd9oaYWWZG1-vmBI3uWQKb6RehgT4aA",
      },
    })
  );
}

get();
