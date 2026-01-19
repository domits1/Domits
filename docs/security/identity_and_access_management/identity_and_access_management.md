# Identity and Access Management - IAM
Identity and Access Management (IAM) is a important component of cloud security and resource management, providing a framework for securely managing who (identity) has access to what (resources) in a system or organization. It helps in ensuring that the right individuals have the appropriate access to resources, which helps mitigate security risks. This Wiki outlines the key components of IAM: Groups, Users, Roles, and Policies.

## Groups
An IAM Group is a collection of IAM users. Groups allow you to manage permissions for multiple users at once by assigning policies to the group instead of individually managing user permissions.

Why we need it:

- Efficiency in Access Management: Groups allow administrators to manage permissions centrally. By applying policies to groups, you can ensure that all users in a group have the same level of access. This is useful when many users need similar permissions, such as employees in the same department.

- Simplifies Access Control: Instead of managing permissions for each user one by one, you can assign users to appropriate groups. For example, you could create groups like "Developers," "Admins," or "Read-Only Users" and assign users based on their role within the organization.

Use Case Example: If an organization has multiple software developers, they can be added to a "Developers" group that has permissions to access code repositories, deploy applications, and view monitoring dashboards.

## Users
An IAM User is an identity created for an individual who needs access to cloud resources. Each user has a unique set of credentials (username and password, or access keys for API access).

Why we need it:

- Personalized Access Control: By creating individual IAM users, each person in the organization can have their own credentials, ensuring that access is secure and traceable. Each user can have specific permissions based on their role.

- Auditability: IAM users provide detailed logging, allowing administrators to track who accessed which resources and when. This is essential for compliance and monitoring.

- API/CLI Access: IAM users can also have programmatic access to resources through access keys, which allows them to interact with cloud services via APIs or command-line interfaces (CLI).

Use case example: An administrator creates an IAM user for a new employee who is a database administrator. The employee is given permissions to manage database services but is restricted from accessing other parts of the infrastructure.

## Roles
An IAM Role is an entity that defines a set of permissions but is not associated with a specific user or group. Instead, roles can be assumed by users, applications, or other services that need temporary access to certain resources.

Why we need it:

- Cross-Service Access: Roles are essential when a service or application needs to access resources in another service or account. For example, an EC2 instance might need to read from an S3 bucket, and it can do so by assuming a role with the necessary permissions.

- Temporary Permissions: Roles allow you to delegate access with temporary credentials, reducing the security risk associated with long-term credentials.

- Least Privilege Principle: Roles help enforce the principle of least privilege by granting the minimum level of access necessary for specific tasks or operations.

Use Case Example: A web application running on an EC2 instance needs to upload files to an S3 bucket. Instead of giving the EC2 instance permanent access credentials, it assumes an IAM role with permissions to write to the bucket.

## Policy
An IAM Policy is a document that defines permissions for users, groups, and roles. Policies are written in JSON and specify what actions are allowed or denied for specific resources. A policy could either be an allow policy or a deny policy.

Why we need it:

- Granular Access Control: Policies allow you to specify precise permissions for users, groups, and roles. You can define which actions are permitted (e.g., reading, writing, deleting), on which resources (e.g., specific S3 buckets, databases), and under what conditions.

- Security and Compliance: By writing detailed policies, organizations can ensure they comply with security best practices and regulatory requirements. For example, policies can be written to prevent accidental deletion of critical resources or restrict access based on IP address or time of day.

- Fine-Tuning Permissions: Policies give administrators fine-grained control over access to resources. This is crucial for enforcing the principle of least privilege and ensuring users only have access to the resources they need to perform their jobs.

Use Case Example: An IAM policy for a database administrator could allow actions like "Create," "Update," and "Delete" on database resources, but deny access to modify IAM permissions or access other parts of the infrastructure.