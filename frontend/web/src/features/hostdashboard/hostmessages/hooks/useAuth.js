import { useUser } from "../context/AuthContext";

export const useAuth = () => {
    const { userId, token } = useUser();
    return { userId, token };
};

