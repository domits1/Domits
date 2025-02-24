import { useUser } from "../context/AuthContext";

export const useAuth = () => {
    const { userId } = useUser();
    return { userId };
};

