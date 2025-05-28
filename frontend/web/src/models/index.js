// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { User, Todo } = initSchema(schema);

export {
  User,
  Todo
};