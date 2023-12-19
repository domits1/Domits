/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
const fetch = require("node-fetch");

exports.handler = async (event, context) => {

  const GRAPHQL_ENDPOINT = process.env.API_DOMITS_GRAPHQLAPIENDPOINTOUTPUT;
  const GRAPHQL_API_KEY = process.env.API_DOMITS_GRAPHQLAPIKEYOUTPUT;

  // Check if userAttributes is present in event.request
  const userEmail = event.request?.userAttributes?.email;
<<<<<<< HEAD

  if (!userEmail) {
=======
  const userPassword = event.request?.userAttributes?.password;

  if (!userEmail || !userPassword) {
>>>>>>> 5662c3fe3beaa309db06e5b3bb6a187efcf7b8b8
    return {
      statusCode: 400,
      body: JSON.stringify({
        errors: [{ message: 'User email or password not provided or invalid.' }],
      }),
    };
  }

  const query = /* GraphQL */ `
    mutation CREATE_USER($input: CreateUserInput!) {
      createUser(input: $input) {
        email,
<<<<<<< HEAD
=======
        password,
>>>>>>> 5662c3fe3beaa309db06e5b3bb6a187efcf7b8b8
      }
    }
  `;

  const variables = {
    input: {
      email: userEmail,
<<<<<<< HEAD
=======
      password: userPassword,
>>>>>>> 5662c3fe3beaa309db06e5b3bb6a187efcf7b8b8
    },
  };

  const options = {
    method: "POST",
    headers: {
      "x-api-key": GRAPHQL_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({query, variables}),
  };

  const response = {};

  try {
    const res = await fetch(GRAPHQL_ENDPOINT, options);
    response.data = await res.json();
    if (response.data.errors) response.statusCode = 400;
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
