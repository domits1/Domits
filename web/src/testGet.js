const token = "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIwMDRhN2UzOC01M2VmLTRmNjItOGNhNi1mZWJmZjFkYjVhNWIiLCJjb2duaXRvOmdyb3VwcyI6WyJIb3N0Il0sImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5ldS1ub3J0aC0xLmFtYXpvbmF3cy5jb21cL2V1LW5vcnRoLTFfbVB4Tmh2U0ZYIiwiY2xpZW50X2lkIjoiNzhqZnJmaHBkZWQ2bWVldmxscGZtbzczbW8iLCJvcmlnaW5fanRpIjoiYjE3ZDA1MjktZGI2OS00MjFiLTgwYTMtOTRhODQwMzNkNTM3IiwiZXZlbnRfaWQiOiJkYmM0YmU1Ny0wZGVlLTQzN2ItOGEyYi1hY2FmODExN2Y4N2MiLCJ0b2tlbl91c2UiOiJhY2Nlc3MiLCJzY29wZSI6ImF3cy5jb2duaXRvLnNpZ25pbi51c2VyLmFkbWluIiwiYXV0aF90aW1lIjoxNzQ0NzkzOTA2LCJleHAiOjE3NDQ3OTkxMTMsImlhdCI6MTc0NDc5NTUxMywianRpIjoiYjE3NzkwMzQtYmRiZi00Yzk5LTk5ZWEtMDFmYzAxZGUwODMzIiwidXNlcm5hbWUiOiIwMDRhN2UzOC01M2VmLTRmNjItOGNhNi1mZWJmZjFkYjVhNWIifQ.TfHl1CLRpW2oSZU6CTyxGmkwKTUexVWhTLeFGPvO2IW-z2NCE3CTrzXu2Vdsd7OF8pM85eiRQ7nMyeynV1bH4oFLILJ3hWSLwYHjFX0T_cEYmQWmXrP3OEz_4eTp8tHgZSPMR1otXD1b78T3XkX6FLNTpp1mwNn5w4FWZ3AqMCMK5tKfDTcBwmI9IWtmGOFXtj9P2LmG2PYy-J5alnA4sXN8ucBhXbC1o3wvArw491ML5_FcevPb3FbutlZj3Az_ZWGQSquXp7PkFmDLye9_fuoq34IZ4bLLkLPBiY7D0MjgYJyTzC9O0LBGzvM3IR5M1E5Ws7UVd4d2kKPdA658SQ";

const fetchWishlist = async () => {
  try {
    const response = await fetch("https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist", {
      method: "GET",
      headers: {
        Authorization: token
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Wishlist:", data);
    console.log(data.AccommodationIDs.join(","));
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
};

fetchWishlist();
