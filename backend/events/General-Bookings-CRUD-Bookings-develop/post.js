import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index.js"
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function post(){
    console.log(
      await handler({
        resource: "/bookings",
        path: "/bookings",
        httpMethod: "POST",
        headers: {
          Authorization:
            "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmMDg5OTlkMy02OTdjLTQ0YTAtYjM4OC1hNDE0MTc4ZDRjNWIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6IjI5OWIzZTViLWZjNjgtNGU1MS1hY2ZmLWZmMWIwOGRlYTA3YSIsImV2ZW50X2lkIjoiYmI3MDBhNmEtZGNjMi00Y2I4LWI1MDYtMjZkNmI0ODQzYzgxIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc1ODU0MDQ0NywiZXhwIjoxNzU5MTcwMjM0LCJpYXQiOjE3NTkxNjY2MzQsImp0aSI6ImNkOWIyZGJhLTM5N2ItNGRjMy1hOTliLWRiYTVhZDA1ZDMwZCIsInVzZXJuYW1lIjoiZjA4OTk5ZDMtNjk3Yy00NGEwLWIzODgtYTQxNDE3OGQ0YzViIn0.av6JVteKSR7y3r995ai5KWGddbvdI4D2Tq1FJaKiz_yg5FeL4GWUnBd4eNQ_xBAsq9iIksAWORt-zwOjyxPlQj83Rvc5omlxhJduksbH423pSJB0ss7nLjUgL2GSIPcrbkrW-mnE5J9y3UrIvfVKD_yBkRTDPsQQPFI8zAHL5-Oi0XpqIi-QeaRsDOyglQ3hr5n5OwCawaK4Ei9S0J8XFM77NAYcySpH2j-C9UcH3dpsOmGHy7ZPxxfhf2ItsZUub_6SNjLaA5D_8zqIbvLCD1RAIGr2FCgXRTTlt_ieKI9E5IgLPCXX_Wwfjfv55haL3WwsrfSEJ14aG2LuiGe09w",
        },
        body: {
          identifiers: {
            property_Id: "3763b443-6a49-476f-a7fa-5c39288cc21c",
          },
          general: {
            guests: 1,
            arrivalDate: 1748995200000,
            departureDate: 1749513600000,
          },
        },
      })
    );
}

post();