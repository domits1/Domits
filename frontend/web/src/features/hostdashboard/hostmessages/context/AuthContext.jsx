import React, { createContext, useState, useEffect, useContext } from "react";
import { Auth } from "aws-amplify";

const getIdToken = async () => {
  const session = await Auth.currentSession();
  return session.getIdToken().getJwtToken();
};

const UserContext = createContext();
export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    async function getCurrentUser() {
      try {
        const user = await Auth.currentAuthenticatedUser();
        setUserId(user.attributes.sub);
      } catch (error) {
        console.error("Error fetching authenticated user:", error);
      }
    }
    getCurrentUser();
  }, []);

  useEffect(() => {
    async function fetchAccessToken() {
      try {
        if (userId) {
          const token = await getIdToken();
          setAccessToken(token);
        }
      } catch (error) {
        console.error("Error fetching access token:", error);
      }
    }
    fetchAccessToken();
  }, [userId]);

  return (
    <UserContext.Provider value={{ userId, accessToken }}>
      {children}
    </UserContext.Provider>
  );
};
