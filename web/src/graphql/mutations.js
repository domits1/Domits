/* eslint-disable */
// this is an auto generated file. This will be overwritten
export const updateChat = /* GraphQL */ `
  mutation UpdateChat(
    $input: UpdateChatInput!
    $condition: ModelChatConditionInput
  ) {
    updateChat(input: $input, condition: $condition) {
      id
      text
      email
      recipientEmail
      isRead
      sortKey
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteChat = /* GraphQL */ `
  mutation DeleteChat(
    $input: DeleteChatInput!
    $condition: ModelChatConditionInput
  ) {
    deleteChat(input: $input, condition: $condition) {
      id
      text
      email
      recipientEmail
      isRead
      sortKey
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const createAccommodation = /* GraphQL */ `
  mutation CreateAccommodation(
    $input: CreateAccommodationInput!
    $condition: ModelAccommodationConditionInput
  ) {
    createAccommodation(input: $input, condition: $condition) {
      id
      accommodation
      description
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateAccommodation = /* GraphQL */ `
  mutation UpdateAccommodation(
    $input: UpdateAccommodationInput!
    $condition: ModelAccommodationConditionInput
  ) {
    updateAccommodation(input: $input, condition: $condition) {
      id
      accommodation
      description
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteAccommodation = /* GraphQL */ `
  mutation DeleteAccommodation(
    $input: DeleteAccommodationInput!
    $condition: ModelAccommodationConditionInput
  ) {
    deleteAccommodation(input: $input, condition: $condition) {
      id
      accommodation
      description
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const createUser = /* GraphQL */ `
  mutation CreateUser(
    $input: CreateUserInput!
    $condition: ModelUserConditionInput
  ) {
    createUser(input: $input, condition: $condition) {
      id
      email
      password
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateUser = /* GraphQL */ `
  mutation UpdateUser(
    $input: UpdateUserInput!
    $condition: ModelUserConditionInput
  ) {
    updateUser(input: $input, condition: $condition) {
      id
      email
      password
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteUser = /* GraphQL */ `
  mutation DeleteUser(
    $input: DeleteUserInput!
    $condition: ModelUserConditionInput
  ) {
    deleteUser(input: $input, condition: $condition) {
      id
      email
      password
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const createTodo = /* GraphQL */ `
  mutation CreateTodo(
    $input: CreateTodoInput!
    $condition: ModelTodoConditionInput
  ) {
    createTodo(input: $input, condition: $condition) {
      id
      name
      description
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateTodo = /* GraphQL */ `
  mutation UpdateTodo(
    $input: UpdateTodoInput!
    $condition: ModelTodoConditionInput
  ) {
    updateTodo(input: $input, condition: $condition) {
      id
      name
      description
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteTodo = /* GraphQL */ `
  mutation DeleteTodo(
    $input: DeleteTodoInput!
    $condition: ModelTodoConditionInput
  ) {
    deleteTodo(input: $input, condition: $condition) {
      id
      name
      description
      createdAt
      updatedAt
      __typename
    }
  }
`;



export const createChat = /* GraphQL */ `mutation CreateChat(
  $input: CreateChatInput!
  $condition: ModelChatConditionInput
) {
  createChat(input: $input, condition: $condition) {
    id
    text
    email
    recipientEmail
    isRead
    sortKey
  }
}
`;


