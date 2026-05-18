import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Auth } from 'aws-amplify';
import { fetchMemberships } from '../hostdashboard/services/teamService';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [isPOM, setIsPOM] = useState(false);
    const [memberships, setMemberships] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const userInfo = await Auth.currentAuthenticatedUser({ bypassCache: true });
                if (userInfo && userInfo.attributes && 'custom:group' in userInfo.attributes) {
                    setUser(userInfo);
                    setRole(userInfo.attributes['custom:group']);
                } else {
                    setUser(userInfo);
                    setRole('Traveler');
                }
            } catch {
                setUser(null);
                setRole(null);
            } finally {
                setIsLoading(false);
            }
        };
        const checkMemberships = async () => {
            try {
                const result = await fetchMemberships();
                setMemberships(Array.isArray(result) ? result : []);
                setIsPOM(Array.isArray(result) && result.length > 0);
            } catch {
                setMemberships([]);
                setIsPOM(false);
            }
        };
        checkUser();
        checkMemberships();
    }, []);

    const hasRole = (allowedRoles) => allowedRoles.includes(role);

    const contextValue = useMemo(
        () => ({ user, role, isPOM, memberships, isLoading, hasRole }),
        [user, role, isPOM, memberships, isLoading]
    );

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );

};
