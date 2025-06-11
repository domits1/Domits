# Index.js
The [index.js](../../../backend/ORM/index.js) file contains a class which contains two methods. The class is set up as a singleton, making sure that there can only be one database connection at a time. 

First is the getInstance method which is the method you use to get the database connection instance as seen in [usage.md](./usage.md).
The initializeDatabase method is where the database connection itself is established.

### Singleton pattern
A singleton is a class where only one instance of the class can exist at a time. This means that you need to use a static method to actually gain access to the class.
This static method checks if the class already has an instance of itself registered, if not, it creates a new instance and returns this instance. If there is already an instance,
it returns the already existing instance.

### getInstance
As stated above, you need a static method to gain access to the instance of the singleton class, in our case, Database. The getInstance method is this exact static method.
It checks if Database.pool (the pool variable in the Database class) is null, if this is the case, it calls the static initializeDatabase method.
This method initializes a database connection and sets the Database.pool variable to this initialized database connection.
If Database.pool is not null, it means that the database connection was previously initialized which means that we don't have to initialize it again.
After checking the Database.pool variable, it simply returns this variable.

### initializeDatabase
In the initializeDatabase method, we first need to retrieve some environment variables like password, host and database schema. To retrieve these, we use the SystemManagerRepository.
This is simply a repository which sends a request to [AWS Systems Manager](https://aws.amazon.com/systems-manager/), to the Parameter Store, which is where we store our environment variables.
After retrieving the environment variables, we can use the DSQLSigner from the `aws-sdk` to generate the login credentials to the database.
Now we have everything we need to establish our database connection. To establish our database connection, we use the typeorm package to create a DataSource and set the Database.pool variable to it.
We can then call the initialize method on this datasource to connect to the database.
---
## models
In the [models](../../../backend/ORM/models) directory, you can find all database models that are currently supported by the ORM. Each file in this directory is it's own table in the database.
The [User_Table.js](../../../backend/ORM/models/User_Table.js) is an example/dummy model which is used in the [CD Template](../../../backend/CD/template/function/data/repository.js).
You can use this table as an example if you want to add more models. Do make sure that you also add the model to the database in [Aurora DSQL](https://eu-west-2.console.aws.amazon.com/dsql/clusters/home)
as this is not done automatically.
---
## util
In the [util](../../../backend/ORM/util) directory, there are two subdirectories. The [exception](../../../backend/ORM/util/exception) directory contains custom exceptions which will be automatically
integrated in your functions as long as you wrap everything in a try catch statement. This allows for easier debugging. The [database](../../../backend/ORM/util/database) directory
contains a getTables function which simply retrieves all models *From the paragraph above*, this method is used in the index.js to initialize these models as repositories.
---
## schema.psql
The [schema.psql](../../../backend/ORM/schema.psql) file is a PostgreSQL script file that creates the database from scratch, be careful with pasting this in as it does also drop the schema and all it's tables.
This also includes all set values like amenities, amenity categories etc. which you will have to manually put back (or write another script to put these in).
When creating a model in the [models](../../../backend/ORM/models) directory, you must also create the PostgreSQL script for it and add it to the [schema.psql](../../../backend/ORM/schema.psql) file.
After adding it, you must also add it to the database itself in [Aurora DSQL](https://eu-west-2.console.aws.amazon.com/dsql/clusters/home) (be careful to only add the script that adds your model and not
the entire [schema.psql](../../../backend/ORM/schema.psql) script as this will, as stated before, drop the entire database).