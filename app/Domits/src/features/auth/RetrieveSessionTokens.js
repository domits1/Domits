import {fetchAuthSession} from '@aws-amplify/core';

const RetrieveSessionTokens = async () => {
  try {
    const session = await fetchAuthSession();
    const tokens = session.tokens;
    console.log(tokens.accessToken.toString());
    return tokens.accessToken.toString();
  } catch (error) {
    console.error(error);
  }
};

export default RetrieveSessionTokens;
