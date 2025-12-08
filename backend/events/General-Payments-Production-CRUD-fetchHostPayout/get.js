import { handler } from "../../functions/General-Payments-Production-CRUD-fetchHostPayout/index.js";
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function get() {
  console.log(
    await handler({
      httpMethod: "GET",
      path: "/retrieve-user-bank-account",
      resource: "/retrieve-user-payouts",
      headers: {
        Authorization:
          "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIzMDQ4ODNkNC0xZTBjLTRjMGUtYTNkMy0zMDdkZTE3MDAzMzciLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6ImNiMDc1Y2NlLTMyN2QtNDRhYS04NDUyLWMwMzE3NzQzOWFmMiIsImV2ZW50X2lkIjoiNmNhMjZiMDYtZThmNC00ZjczLThkNTYtYTFlMTA1NThlNGM3IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc2NDA2MTU4OCwiZXhwIjoxNzY1MTg4MTQxLCJpYXQiOjE3NjUxODQ1NDEsImp0aSI6IjYyNjAwZDNkLWIxOTYtNDZhNS1hZDA1LWY4NjFjMWMzNjk4NyIsInVzZXJuYW1lIjoiMzA0ODgzZDQtMWUwYy00YzBlLWEzZDMtMzA3ZGUxNzAwMzM3In0.jZZjQX1uECPboHCAhrOYGG0UlRMThraE5QR2MR0Z9WokQNGa9kF3b0Wnyn3atnmghbtz1hvYgeDB2SwAhMDmM-sGE6Rhf86CGYvKyvgNV3uEIpwOunzHNsxk_mypqWiaexsQJrB8ogjO5-L5MgdvvmE3BmR5oiUoqtx3gG00iO6EGha55N2JT6tk2AM5amRrCiAqnYCjKGun1usqQDGeslcbYCFuFKp9V6yIlyUgpFIrYxq-sShnFJFAQOjw0qzHsLJFHGR49sBACCgfv9H6jW_HU_7ZokYMCCdi5IzMNOMP59Npge0LgXRncWOhkoGjdv-mZalDFcX2Pdmw1Y6qhg",
      },
    })
  );
}

get();
