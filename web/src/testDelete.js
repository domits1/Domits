const axios = require("axios");

const token = "";


axios.delete("https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist", {
  headers: {
    Authorization: token,
    "Content-Type": "application/json"
  },
  data: {
    accommodationId: ""
  }
})
.then(res => {
  console.log("🗑️ Verwijderd:", res.data);
})
.catch(err => {
  console.error("❌ Error:", err.response?.data || err.message);
});
