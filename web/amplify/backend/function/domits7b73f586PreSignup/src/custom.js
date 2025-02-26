const fetch = require("node-fetch");

exports.handler = async (event, context) => {
  const GRAPHQL_ENDPOINT = process.env.API_DOMITS_GRAPHQLAPIENDPOINTOUTPUT;
  const GRAPHQL_API_KEY = process.env.API_DOMITS_GRAPHQLAPIKEYOUTPUT;
  const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
  const GROUP_NAME = "Guest";

  // Check if userAttributes is present in event.request
  const userEmail = event.request?.userAttributes?.email;

  if (!userEmail) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        errors: [{ message: 'User email or password not provided or invalid.' }],
      }),
    };
  }

  // GraphQL mutation to create user
  const createUserQuery = /* GraphQL */ `
    mutation CREATE_USER($input: CreateUserInput!) {
      createUser(input: $input) {
        email,
      }
    }
  `;

  // GraphQL variables for creating user
  const createUserVariables = {
    input: {
      email: userEmail,
    },
  };

  // Options for the GraphQL request to create user
  const createUserOptions = {
    method: "POST",
    headers: {
      "x-api-key": GRAPHQL_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: createUserQuery,
      variables: createUserVariables,
    }),
  };

  // Response object
  const response = {};

  try {
    // Execute GraphQL request to create user
    const createUserRes = await fetch(GRAPHQL_ENDPOINT, createUserOptions);
    response.data = await createUserRes.json();

    if (response.data.errors) {
      response.statusCode = 400;
    } else {
      // User creation successful, now add user to Cognito group
      const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

      const params = {
        GroupName: GROUP_NAME,
        UserPoolId: USER_POOL_ID,
        Username: userEmail,
      };

      // Add user to Cognito group
      await cognitoIdentityServiceProvider.adminAddUserToGroup(params).promise();
    }
  } catch (error) {
    response.statusCode = 400;
    response.body = {
      errors: [
        {
          message: error.message,
          stack: error.stack,
        },
      ],
    };
  }

  return {
    ...response,
    body: JSON.stringify(response.body),
  };
};
