## How to use our ORM

To use our implementation, you must import the Database package as well as a model. To import the Database package,
import the Database package into your function like so:

`import Database from "database";`

*Note, to use this database package, you must have also ran `npm ci` for a production build or `npm i` for a development
build.*

Next you must import the model you want to use, simply go into the [models](../../../backend/ORM/models) directory and
choose the database model you want to use.
Next, go into your function and import this model, for example:

`import {User_Table} from "database/models/User_Table";`

After importing the Database package and your table, you can use it by first getting the database connection instance,
you can do this by calling the provided getInstance function like so:

`const client = await Database.getInstance();`

Now that you have the database connection instance, you can use it to query the database. For query syntax,
see [typeorm](https://typeorm.io).
You can query the database by first requesting the repository of your table followed by your query, for example:

`const response = await client.getRepository(User_Table).createQueryBuilder().getMany();`

You can make your queries as simple and as advanced as possible but do note that your colleagues have to review your code or maybe refactor it at a later date,
so document what your queries do so it won't be impossible to understand for someone with less experience.