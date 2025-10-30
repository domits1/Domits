# Core functionality
The property CRUD lambda function is responsible for 3 functionalities, these being: a create method to register a property, a, not yet implemented, delete method to disable a property and make it anonymous. And finally the main read methods for the home and landingpage which return a set amount of entries of certain property types.

# Security
We implement security with 'Access control'. Access control is authorizing request based on certain factors. In this functionality, we implement two forms of access control, this being 'Role-based Access control' and 'Owner-based Access control'. Role-based access control is, like the word suggests, access control based off of given user roles. In this functionality we authorize create requests by confirming that, the user who makes the request is part of the 'Host' group. We do this by searching the user in Cognito, by the 'access-token' in the 'Authorization' header, and then confirming the 'custom:group' attribute is equal to the 'Host' group.

![afbeelding](https://github.com/user-attachments/assets/11a800e8-c839-40a2-900a-505a961dac97)

Owner-based access control is access control based off of the relation between user that makes the request and the entity they are trying to access. We authorize delete requests by confirming that, the user who makes the request is the owner of the given property. We do this by searching the user in Cognito, by the 'access token' in the 'Authorization' header, and the property in DynamoDB, by the given id of the property. We then confirm that the 'Username' attribute of the user from Cognito is equal to the 'hostId' attribute of the property in DynamoDB.

![afbeelding](https://github.com/user-attachments/assets/b3123bbe-4403-4c0d-b2b6-4194802a3327)

# Design pattern
We implement a 'Builder pattern' to allow easy and versatile creation of objects. As not all types of properties require the same information, this allows us to decide for ourselves what attributes should be added to an object. Think for example about boats and campers needing some technical information while houses don't need these.

See: Lambda function PropertyHandler directory business/service/propertyBuilder.js

# Architectural pattern
For this functinoality, we implement a 'Layered-architecture' or 'Three-Tiered-Architecture'. This refers to the 3 layers of the system, this being the: controller-, business- and data-layer. Each layer has its own task and responsibility. The controller-layer being the top layer of the system receives the requests, retrieves the data from the request and returns a response. The business-layer being the second layer of the system is for business logic, this layer validates all given data and compares given data to data we have in our database. Finally the data-layer is responsible for all database interactions, it retrieves, updates, deletes and saves data to the database.

We use this architecture as it's generally the easiest to learn and implement while it also enforces you to implement correct Object Oriented Programming.

# Class diagram
The following class diagram shows all property entities and how they are connected. (User refers to the user in Cognito)
![mermaid-flow-1x(1)](https://github.com/user-attachments/assets/73c7fa0a-0c72-4f82-889b-9743f4e29d60)

MermaidFlow: https://github.com/domits1/Domits/wiki/Property-Class-Diagram-MermaidFlow

# Sequence diagram
The following sequence diagram shows the rough flow of the Create functionality.
![sequence-diagram-with-background](https://github.com/user-attachments/assets/a40b7281-35c4-44ce-b497-a18139e0e1b1)

# Request formats
As there are many different HTTP methods implemented in the PropertyHandler lambda function, each method requires its own format. We need these formats to check what method is being requested and what response we should give the user. The methods require the following formats:

[POST](./property_handler_post_format.md)

[GET](./property_handler_get_format.md)