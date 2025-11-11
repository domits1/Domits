# Information Security Policy
**Version:** 1.0  
**Approved by:** Management  
**Last Updated:** 11-11-2025

---

## 1. Purpose
The purpose of this Information Security Policy is to ensure the confidentiality, integrity, and availability of company data hosted in Amazon Web Services (AWS).  
This policy supports compliance with **ISO 27001**, GDPR, and customer contractual requirements.

---

## 2. Scope
This policy applies to:

- All employees, contractors, and third parties
- All AWS services used by the company (e.g., IAM, EC2, S3, RDS, Lambda)
- All systems that store, process, or transmit company data

---

## 3. Roles and Responsibilities

| Role | Responsibility |
|------|---------------|
| Security Manager | Maintains this policy and performs audits |
| AWS Account Owner | Ensures account-level security configuration |
| DevOps / Engineers | Implement security controls in AWS |
| All Employees | Follow access rules and report security incidents |

---

## 4. Access Control (AWS IAM)

- Access is granted based on **least privilege** and **need-to-know**.
- IAM is integrated with MFA for all users (mandatory).
- IAM access keys must be rotated at least every **90 days**.
- Root account access is restricted and protected with MFA.
- Use of IAM Roles is required instead of long-term access keys whenever possible.

> **AWS Control References**: IAM, AWS SSO, IAM Access Analyzer

---

## 5. Data Protection

- All data stored in AWS must be encrypted at rest using **AES-256** or AWS-managed keys (KMS).
- All data transmitted must use **TLS 1.2 or higher**.
- S3 buckets must be private by default (no public access unless approved by Security Manager).

> **AWS Control References**: S3 Block Public Access, KMS, ACM

---

## 6. Logging, Monitoring & Incident Response

- AWS **CloudTrail** must be enabled in all regions.
- Logs must be stored centrally and retained for **minimum 365 days**.
- AWS **Security Hub** and **GuardDuty** must be enabled and monitored.
- All security incidents must be reported within **24 hours** to the Security Manager.

> **AWS Control References**: CloudTrail, CloudWatch, Security Hub, GuardDuty

---

## 7. Backup & Disaster Recovery

- AWS-managed backup policies must be configured for production data.
- Backups must be tested at least **annually**.
- DR must be documented and support recovery within approved RTO/RPO.

> **AWS Control References**: Backup, S3 Versioning, Multi-AZ, Disaster Recovery planning

---

## 8. Vendor and Third-Party Compliance

- Only AWS regions and services that are covered by **AWS ISO 27001 certification** may store production data.
- AWS compliance documentation must be downloaded from **AWS Artifact** annually.

> **AWS Control References**: AWS Artifact

---

## 9. Continuous Improvement

- Internal audits must be conducted at least **once per year**.
- Security findings must be tracked until resolved.

---

## 10. Policy Violations

Violations of this policy may result in restricted access, disciplinary action, or termination.

---

**Approved By:**  
`<Name of CEO / Security Manager>`  
`<Signature>`  
`<Date>`

