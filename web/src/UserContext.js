import React, { createContext, useContext, useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const userInfo = await Auth.currentAuthenticatedUser();
                setUser(userInfo);
                const userRole = userInfo.attributes['custom:group'] || 'guest';
                setRole(userRole);
            } catch (error) {
                console.log(error);
                setUser(null);
                setRole(null);
            } finally {
                setIsLoading(false);
            }
        };
        checkUser();
    }, []);
    
    return <UserContext.Provider value={{ user, role, isLoading }}>{children}</UserContext.Provider>;
};