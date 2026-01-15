# Domits AWS Access Guide – Users and Groups

## 1️⃣ Overview

All AWS access is managed via **IAM users grouped into IAM groups**. Each group defines a **set of permissions**, and users inherit access from their group membership.

> ✅ No individual long-lived access policies; all access comes from groups.

---

## 2️⃣ AWS IAM Groups and Permissions

| Group Name                  | Purpose                                   | Permissions                                               |
|------------------------------|-------------------------------------------|-----------------------------------------------------------|
| `domits-platform-admins`     | Full administrative access to all platform infrastructure | AdministratorAccess                                      |
| `domits-security-auditors`   | Security and audit tasks only             | SecurityAudit, ReadOnlyAccess                             |
| `domits-cloud-operators`     | Cloud deployment and operational tasks   | EC2, S3, EKS, CloudWatch, CloudFormation                 |
| `domits-backend-developers`  | Backend application development          | Lambda, API Gateway, DynamoDB, SQS, SNS                  |
| `domits-frontend-developers` | Frontend deployment                       | S3, CloudFront, Route53                                   |
| `domits-data-engineers`      | Data pipelines and analytics             | S3, Athena, Glue, Redshift, Lake Formation               |
| `domits-quality-assurance`   | Testing and CI/CD pipelines               | ReadOnlyAccess, CloudWatch Logs, Test resource access    |

---

## 3️⃣ Example Users

| Username     | Group Membership                                       | Notes                             |
|-------------|--------------------------------------------------------|-----------------------------------|
| `alice.doe`  | `domits-backend-developers`, `domits-cloud-operators` | Backend developer with deployment access |
| `bob.smith`  | `domits-frontend-developers`                           | Frontend developer                |
| `carol.jones`| `domits-security-auditors`                             | Security auditing only            |
| `david.lee`  | `domits-platform-admins`                               | Platform administrator            |
| `emma.kim`   | `domits-data-engineers`                                | Data engineer                     |

---

## 4️⃣ Access Guidelines

1. **Group-based access only** – No direct user policies.  
2. **Least privilege** – Assign the smallest group needed.  
3. **Environment-specific roles** – Separate roles/groups for dev, staging, prod if needed.  
4. **Audit and review** – Group membership reviewed quarterly.  
5. **Password & MFA** – Enforce strong passwords + MFA for all users.  





