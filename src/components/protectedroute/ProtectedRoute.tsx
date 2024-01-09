import { ReactNode, useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { Auth } from 'aws-amplify';

type UserRoles = "Admin" | "Homeowner" | "Professional"

type ProtectedRouteProps = {
    allowedRoles: UserRoles[]
    page: ReactNode
    redirectTo: string
}

export const ProtectedRoute = ({ allowedRoles, page, redirectTo }: ProtectedRouteProps) => {
    const [isAuthorized, setIsAuthorized] = useState<boolean>(false)
    const navigate = useNavigate()

    async function checkAuthorization() {
        try {
            const user = await Auth.currentAuthenticatedUser()
            const userRoles = user?.signInUserSession?.accessToken?.payload['cognito:groups'] || []
            console.log("userRoles:", userRoles);
            console.log("allowedRoles:", allowedRoles);

            if (allowedRoles.some(role => userRoles.includes(role))) {
                setIsAuthorized(true);
            } else {
                navigate(redirectTo);
            }
        } catch (error) {
            console.error("Something went wrong:", error)
            // Redirect if there is no authenticated user
            navigate(redirectTo);
        }
    }

    useEffect(() => {
        checkAuthorization()
    }, [])

    return isAuthorized ? page : <></>
}
