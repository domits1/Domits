# AWS Risk Management System

1. Define Risk Context  
   - Determine business critical systems and data locations (S3, RDS, EC2, etc.)

2. Risk Identification  
   - Enable AWS IAM Access Analyzer  
   - Enable AWS Config with compliance rules  
   - Review security gaps in AWS Trusted Advisor

3. Risk Assessment  
   - Centralize all findings in AWS Security Hub  
   - Use AWS Audit Manager (ISO 27001 framework template)

4. Risk Treatment  
   - Apply IAM least privilege  
   - Encrypt data with AWS KMS  
   - Block public access on S3 buckets  
   - Set SCP (Service Control Policies)

5. Monitoring  
   - Enable CloudTrail in **all regions**  
   - Enable GuardDuty (threat detection)  
   - Set CloudWatch alerts (IAM changes, new public S3 bucket, etc.)

6. Documentation  
   - Store evidence in AWS Audit Manager  
   - Download AWS ISO certificates from AWS Artifact
