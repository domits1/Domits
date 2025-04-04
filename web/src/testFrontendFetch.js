const fetch = require("node-fetch"); 

const testFetch = async () => {
  const token = ""; 
  try {
    const response = await fetch("https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
        "Origin": "http://localhost:3000" 
      },
      body: JSON.stringify({
        accommodationId: "" 
      }),
    });

    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", text);
  } catch (err) {
    console.error("❌ Error:", err);
  }
};

testFetch();

