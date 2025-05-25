/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateChat = /* GraphQL */ `
  subscription OnCreateChat($filter: ModelSubscriptionChatFilterInput) {
    onCreateChat(filter: $filter) {
      id
      userId
      recipientId
      text
      email
      recipientEmail
      isRead
      sortKey
      createdAt
      channelID
    }
  }
`;
export const onUpdateChat = /* GraphQL */ `
  subscription OnUpdateChat($filter: ModelSubscriptionChatFilterInput) {
    onUpdateChat(filter: $filter) {
      id
      userId
      recipientId
      text
      email
      recipientEmail
      isRead
      sortKey
      createdAt
      channelID
      updatedAt
      __typename
    }
  }
`;
export const onDeleteChat = /* GraphQL */ `
  subscription OnDeleteChat($filter: ModelSubscriptionChatFilterInput) {
    onDeleteChat(filter: $filter) {
      id
      userId
      recipientId
      text
      email
      recipientEmail
      isRead
      sortKey
      createdAt
      channelID
      updatedAt
      __typename
    }
  }
`;
export const onCreateAccommodation = /* GraphQL */ `
  subscription OnCreateAccommodation(
    $filter: ModelSubscriptionAccommodationFilterInput
  ) {
    onCreateAccommodation(filter: $filter) {
      id
      accommodation
      description
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateAccommodation = /* GraphQL */ `
  subscription OnUpdateAccommodation(
    $filter: ModelSubscriptionAccommodationFilterInput
  ) {
    onUpdateAccommodation(filter: $filter) {
      id
      accommodation
      description
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteAccommodation = /* GraphQL */ `
  subscription OnDeleteAccommodation(
    $filter: ModelSubscriptionAccommodationFilterInput
  ) {
    onDeleteAccommodation(filter: $filter) {
      id
      accommodation
      description
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateUser = /* GraphQL */ `
  subscription OnCreateUser($filter: ModelSubscriptionUserFilterInput) {
    onCreateUser(filter: $filter) {
      id
      email
      password
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateUser = /* GraphQL */ `
  subscription OnUpdateUser($filter: ModelSubscriptionUserFilterInput) {
    onUpdateUser(filter: $filter) {
      id
      email
      password
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteUser = /* GraphQL */ `
  subscription OnDeleteUser($filter: ModelSubscriptionUserFilterInput) {
    onDeleteUser(filter: $filter) {
      id
      email
      password
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateTodo = /* GraphQL */ `
  subscription OnCreateTodo($filter: ModelSubscriptionTodoFilterInput) {
    onCreateTodo(filter: $filter) {
      id
      name
      description
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateTodo = /* GraphQL */ `
  subscription OnUpdateTodo($filter: ModelSubscriptionTodoFilterInput) {
    onUpdateTodo(filter: $filter) {
      id
      name
      description
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteTodo = /* GraphQL */ `
  subscription OnDeleteTodo($filter: ModelSubscriptionTodoFilterInput) {
    onDeleteTodo(filter: $filter) {
      id
      name
      description
      createdAt
      updatedAt
      __typename
    }
  }
`;

