# Backup
AWS Backup is a fully managed service that centralizes and automates data backup across various AWS services. It provides a unified backup solution, enabling organizations to create, manage, and monitor backups for their AWS resources.

## Backup plan
Here are the primary components of a typical backup plan:

Backup Rule: A backup rule specifies the frequency and timing of backups. It includes:

- Backup Frequency: How often backups occur, such as hourly, daily, weekly, or monthly.

- Backup Window: The preferred time window for backups to run, which helps minimize any performance impacts on resources during peak hours.

- Lifecycle Management: The backup lifecycle, which specifies how long each backup is retained and when it transitions to lower-cost storage (like archival storage).

Resource Assignment: Resources that are part of the backup plan are identified and assigned within AWS Backup. Resources can include specific AWS services like Amazon EC2, RDS, DynamoDB, and S3 buckets.

Assignment can be done:
Directly by selecting resources individually, or Through Tagging where AWS Backup automatically includes any resource that matches specified tags (e.g., "Environment: Production" or "Backup: Enabled").

Retention Period:
Retention rules specify how long each backup is retained. This is essential for ensuring data availability while also controlling storage costs. AWS Backup allows retention periods to be defined from days to years, based on compliance requirements.

Cross-Region and Cross-Account Backups:
For added data protection, AWS Backup can create backups across different regions or AWS accounts, providing an extra layer of redundancy in case of regional failures or for compliance with data sovereignty requirements.

Backup Vaults:
AWS Backup stores backups in backup vaults, which act as secure containers for backups. Vaults provide encryption and access control, ensuring that only authorized users can access specific backups. Vaults also support cross-account access, making it easier to manage backups securely across multiple AWS accounts.