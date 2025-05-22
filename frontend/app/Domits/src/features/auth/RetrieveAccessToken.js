import {fetchAuthSession} from '@aws-amplify/core';

const RetrieveAccessToken = async () => {
  try {
    const session = await fetchAuthSession();
    const tokens = session.tokens;
    return tokens.accessToken.toString();
  } catch (error) {
    console.error(error);
  }
};

export default RetrieveAccessToken;
