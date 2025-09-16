# 🔄 Transition to Aurora DSQL (PostgreSQL)

Since **17-06**, we’ve begun integrating our existing database into **Aurora DSQL (PostgreSQL)**.  
See issue [#1983](https://github.com/domits1/Domits/issues/1983) for more information about this transition.

The reason for this transition is simple:  
**DynamoDB does not support complex SQL-like queries**, such as filtering across multiple tables or performing advanced joins. Aurora DSQL, being PostgreSQL-compatible, **gives us much more flexibility and power** for relational operations.

We connect to Aurora through an **ORM inside our Lambda functions**. For that reason, it's crucial for developers to understand how to work with this new setup.

> [!IMPORTANT]
> This guide assumes **basic SQL knowledge**.  
> If you’re new to SQL or PostgreSQL, we **strongly recommend** going through the [PostgreSQL DBA Roadmap](https://roadmap.sh/postgresql-dba).
> Otherwise, personally, I followed this [course](https://www.youtube.com/watch?v=HXV3zeQKqGY) on Youtube to get a grasp of the fundamentals. 
> I summed it up too a while ago, and you can check it out [here](https://github.com/Bambaclad1/Bambaclad1/wiki/SQL-Fundamentals-Summary)

---

## 🚀 How to Connect to the Database through Cloudshell

1. Go to the [**AWS Console**](https://console.aws.amazon.com/).
2. Navigate to **Aurora DSQL** using the search bar.
3. Select the region: `eu-west-2 (London)`.
4. Go to the **Clusters** section.
5. Choose the cluster:  
   `6qabud3emiqhbfkh2h4ttwz35i` in `eu-west-2 (London)`.
6. Click **Connect**, then select **“Open in CloudShell”**.
7. Choose **Connect as Admin**, then click **Launch CloudShell**.
8. In CloudShell, click **Run Command** to execute the connection command.

You are now connected to the database and can begin executing SQL commands.

## 🚀 How to connect to the Database through Datagrip 
> [!NOTE]
> JetBrains DataGrip is a cross-platform IDE for working with SQL and databases, including PostgreSQL. DataGrip includes a robust GUI with an intelligent SQL editor. 
> Do keep in mind you have to input a new token every hour, because the tokens time out in a hour.

**To set up a new Aurora DSQL connection in JetBrains DataGrip**

Choose New Data Source and choose PostgreSQL.

In the Data Sources/General tab, enter the following information:

Host – Use your cluster endpoint.

Port – Aurora DSQL uses the PostgreSQL default: 5432

Database – Aurora DSQL uses the PostgreSQL default of postgres

Authentication – Choose User & Password .

Username – Enter admin.

Password – [Generate a token](https://docs.aws.amazon.com/aurora-dsql/latest/userguide/SECTION_authentication-token.html) and paste it into this field.
Generating a token for Datagrip:
![manually-create-authtoken-cloudshell](https://github.com/user-attachments/assets/9d27d799-f838-4836-84dc-726c07f9a90f)

URL – Don't modify this field. It will be auto-populated based on the other fields.

Password – Provide this by generating an authentication token. Copy the resulting output of the token generator and paste it into the password field.

> [!Note]
> You must set SSL mode in the client connections. Aurora DSQL supports PGSSLMODE=require. Aurora DSQL enforces SSL communication on the server side and will reject non-SSL connections.

You should be connected to your cluster and can start running SQL statements:
[This](https://github.com/user-attachments/assets/97521754-dd94-4755-91ef-50c6cf4590db) is how Datagrip would look like and work compared to CloudShell 

Source: [AWS Docs](https://docs.aws.amazon.com/aurora-dsql/latest/userguide/getting-started.html)

---

## 🗂️ How to Work With a Specific Schema

Once connected in CloudShell:

1. Type `\dn` to list all available schemas.
2. Pick a schema you'd like to work in. For example, `test`.
3. Set your session to that schema by running: `SET search_path TO test;`
4. Now type `\d` to get a overview of all the tables in the database. For this example, we are using the booking table.
5. Type this command: `SELECT * FROM booking;`, and it will show everything in our booking table.

>[!NOTE]
> You can always get information about a specific command by using the wildcard \h

## 🛢️ Connecting your Lambda function to the Database
Before continuing, ensure that your Lambda function has this IAM role. `LambdaDSQLConnectAdminAccess`
If it doesn't, add a role to your Lambda function that gives `dsql:DbConnectAdmin` permissons.
![image](https://github.com/user-attachments/assets/a167f369-d3f7-4c7a-b069-4bd9c9cf3094)

> [!Note]
> We use [TypeORM](https://typeorm.io/) to make writing queries to the database easier from our functions. For that, we use it's [QueryBuilder](https://typeorm.io/docs/query-builder/select-query-builder/). I'd advice you to take a look a the query builder before continuing to get a basic grasp of the functionality.

## Putting data in your table using the QueryBuilder
... (to be filled in.. refer to [typeORM] (https://typeorm.io/docs/query-builder/select-query-builder/)docs..)
## Getting data in your table using the QueryBuilder
...

## Updating data in your table using the QueryBuilder
...

## Removing data in your table using the QueryBuilder
...



