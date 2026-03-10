import { useUser } from "../context/AuthContext";

export const useAuth = () => {
  const { userId, accessToken } = useUser();
  return { userId, accessToken };
};
