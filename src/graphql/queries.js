/* eslint-disable */
// this is an auto generated file. This will be overwritten

<<<<<<< HEAD
export const getAccommodation = /* GraphQL */ `
  query GetAccommodation($id: ID!) {
    getAccommodation(id: $id) {
      id
      accommodation
      description
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listAccommodations = /* GraphQL */ `
  query ListAccommodations(
    $filter: ModelAccommodationFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listAccommodations(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        accommodation
        description
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getUser = /* GraphQL */ `
  query GetUser($id: ID!) {
    getUser(id: $id) {
      id
      email
      password
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listUsers = /* GraphQL */ `
  query ListUsers(
    $filter: ModelUserFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listUsers(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        email
        password
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
=======
>>>>>>> 5662c3fe3beaa309db06e5b3bb6a187efcf7b8b8
export const getTodo = /* GraphQL */ `
  query GetTodo($id: ID!) {
    getTodo(id: $id) {
      id
      name
      description
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listTodos = /* GraphQL */ `
  query ListTodos(
    $filter: ModelTodoFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listTodos(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        name
        description
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
