import { handler } from "../../functions/General-Payments-Production-Create-StripeAccount/index.js";
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function post() {
  console.log(
    await handler({
      httpMethod: "POST",
      headers: {
        Authorization:
          "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmMDg5OTlkMy02OTdjLTQ0YTAtYjM4OC1hNDE0MTc4ZDRjNWIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6ImQ5NDczMzMwLTUxNjMtNDg3Yi05MDY2LTAxYzhlN2JhOGJlMyIsImV2ZW50X2lkIjoiYmM1YjBiNTAtMWRkYy00MDk1LTkxNGUtYWZmZWU2MDQ1NGQ4IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc1NzkyOTUyMSwiZXhwIjoxNzU3OTM5OTk0LCJpYXQiOjE3NTc5MzYzOTQsImp0aSI6ImI3MmE3MjRlLTNiMTktNGI5NC1hOTA2LWE5YTYwMDNkNGMzYiIsInVzZXJuYW1lIjoiZjA4OTk5ZDMtNjk3Yy00NGEwLWIzODgtYTQxNDE3OGQ0YzViIn0.OFceWV7lFzR1NWRQoNNNpBUgAh1Fw93C8V-5JcgGuHIhKz8So66TIWSn564lvfhLy6EegAgm73TafLUw_iqmh-uYKWTGXElmfi-32IlBmZ-UNwgBx40zqbpHeuTZS3sqS_4qW1M4lhzA9dSdUcfwf94BOWprDnCayPzUQ0tQBoYisiA0tdnB64RSl_GrZuHqS5f5PQ90a3oEYzqCv8ItyQbj0S47-M1FVgU5NeNVMASYhDmvkEDrhXGIVheETDWCoNKJqw4xDbeXsPTUX5nRQAnBqJxKQSvYX9shyl7Qb5pq35jfqbTi52oy7xMWMXutLWMWayjjrjWRiLqMWovilA", // Replace with your actual token.
      },
      body: JSON.stringify({}),
    })
  );
}

post();
