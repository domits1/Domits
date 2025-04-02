const axios = require("axios");

const token = "";


axios.get("https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist", {
  headers: {
    Authorization: token
  }
})
.then(res => {
  console.log("✅ Wishlist:", res.data);
})
.catch(err => {
  console.error("❌ Error:", err.response?.data || err.message);
});
