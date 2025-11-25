import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// AppSync GraphQL endpoint
const httpLink = createHttpLink({
  uri: 'https://73nglmrsoff5xd5i7itszpmd44.appsync-api.eu-north-1.amazonaws.com/graphql',
});

// Auth link with API key
const authLink = setContext((_, { headers }) => {
  return {
    headers: {
      ...headers,
      'x-api-key': 'da2-r65bw6jphfbunkqyyok5kn36cm',
    }
  };
});

// Create Apollo Client for calendar operations
export const calendarApolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
