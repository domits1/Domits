import { Auth } from 'aws-amplify';

const useUserDetails = (setMessages, fetchPollySpeech) => {

    const getUserDetails = async () => {
        try {
            const userInfo = await Auth.currentUserInfo();

            if(!userInfo){
                return {userId: null,username: null}
            }

            const userId = userInfo.attributes.sub
            const username  = userInfo.attributes['custom:username'] || 'Host';

            return {userId, username}
        } catch (error) {
            console.log(error)
        }
    };

    getUserDetails();

    return getUserDetails();
};

export default useUserDetails;
