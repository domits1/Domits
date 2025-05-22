import React, { createContext, useState, useEffect, useContext } from 'react';
import { Auth } from 'aws-amplify';
import {getAccessToken}  from '../../../../services/getAccessToken';

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
        console.error('Error fetching authenticated user:', error);
      }
    }
    getCurrentUser();
  }, []);

  useEffect(() => {
    async function fetchAccessToken() {
      try {
        if (userId) {
          const token = await getAccessToken(userId);
          setAccessToken(token);
        }
      } catch (error) {
        console.error('Error fetching authenticated user:', error);
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
