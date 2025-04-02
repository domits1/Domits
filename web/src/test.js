const axios = require("axios");

const token = "";

axios.post(
  "https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist",
  { accommodationId: "" },
  {
    headers: {
      Authorization: token,
      "Content-Type": "application/json"
    }
  }
).then(res => {
  console.log("✅ Response:", res.data);
}).catch(err => {
  console.error("❌ Error:", err.response?.data || err.message);
});


