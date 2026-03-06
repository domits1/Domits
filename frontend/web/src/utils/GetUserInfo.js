import { Auth } from 'aws-amplify';

const fetchUserInfo = async () => {
    try {
        const user = await Auth.currentAuthenticatedUser();
        if (!user) {
            return null;
        }
        const userInfo = await Auth.currentUserInfo();
        return userInfo.attributes;
    } catch (error) {
        console.error("Error fetching user info:", error);
        return null;
    }
};

export default fetchUserInfo;