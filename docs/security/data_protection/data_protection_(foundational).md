# Data protection

## Data security provided by AWS
- AWS ensures data security through a comprehensive suite of built-in features and tools designed to protect your data at every stage. For data at rest, AWS provides encryption using services like AWS Key Management Service (KMS) or CloudHSM for hardware-based key storage. For data in transit, AWS uses SSL/TLS protocols to encrypt communication, safeguarding information as it moves between systems.

- Access control is another critical component, and AWS Identity and Access Management (IAM) allows fine-grained permissions to ensure only authorized users or applications can access sensitive resources. Monitoring tools like Amazon GuardDuty provide continuous threat detection, while AWS CloudTrail offers detailed logs of API activity, enabling real-time audits and investigations.

- Additionally, AWS guarantees high data durability through services like Amazon S3, designed to achieve 99.999999999% (11 9’s) durability. The platform also complies with global security standards such as GDPR, HIPAA, PCI DSS, and ISO 27001, giving businesses a secure foundation that aligns with regulatory requirements worldwide.

## Customer responsibilities for data security
- Under the Shared Responsibility Model, customers are responsible for securing their data within AWS environments. This starts with configuring IAM roles and permissions to restrict access based on the principle of least privilege. Strong password policies and enabling multi-factor authentication (MFA) for all accounts help further secure access to resources.

- Customers should also ensure proper encryption for their data, whether using AWS-managed or customer-managed keys. Regularly reviewing and auditing activity logs in AWS CloudTrail is essential for identifying and addressing any suspicious behavior. Implementing backup strategies, such as enabling versioning in Amazon S3 or utilizing AWS Backup, ensures data is recoverable in case of accidental deletion or corruption.

- Network security is another critical responsibility. Properly configuring security groups, Network Access Control Lists (NACLs), and firewall rules minimizes exposure to potential threats. By actively leveraging AWS tools and adhering to best practices, customers can create a robust and secure cloud environment.