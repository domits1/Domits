import React, { createContext, useState, useEffect, useContext } from 'react';
import { Auth } from 'aws-amplify';


const UserContext = createContext();
export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);

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

  return (
    <UserContext.Provider value={{ userId }}>
      {children}
    </UserContext.Provider>
  );
};
