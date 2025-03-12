import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const Callback = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchToken = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get("code");

      if (code) {
        console.log("✅ OAuth code received:", code);

        const tokenEndpoint = "https://eu-north-1ey5dodobt.auth.eu-north-1.amazoncognito.com/oauth2/token";
        const clientId = "7bbglkn4fgvf5pg81veov5p0oi"; 
        const redirectUri = "http://localhost:3000/callback";

        const data = new URLSearchParams();
        data.append("grant_type", "authorization_code");
        data.append("client_id", clientId);
        data.append("code", code);
        data.append("redirect_uri", redirectUri);

        try {
          const response = await axios.post(tokenEndpoint, data, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          });

          console.log("✅ Access token received:", response.data);
          localStorage.setItem("access_token", response.data.access_token);

          setTimeout(() => {
            navigate("/home");
          }, 2000);
        } catch (error) {
          console.error("❌ Error fetching access token:", error.response ? error.response.data : error);
        }
      }
    };

    fetchToken();
  }, [location, navigate]);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Processing... Redirecting you to home</h2>
    </div>
  );
};

export default Callback;
