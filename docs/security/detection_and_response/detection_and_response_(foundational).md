# Detection
Detection is the process of continuously monitoring your AWS environment to identify potential security threats, vulnerabilities, and misconfigurations. AWS provides several services that automatically detect suspicious activity, unusual behavior, or potential security incidents.

## AWS detection tools
- Amazon GuardDuty: A threat detection service that continuously monitors for malicious activity and unauthorized behavior by analyzing AWS CloudTrail, VPC Flow Logs, and DNS logs. GuardDuty can identify potential threats such as compromised instances, unusual API calls, and attempts to access data from unfamiliar regions.

- AWS Security Hub: Provides a centralized view of security alerts from multiple AWS services, including GuardDuty, Amazon Inspector, and AWS Config. It aggregates findings and assesses your security posture based on predefined standards.

- AWS Config: A service that tracks configuration changes in your AWS resources. AWS Config continuously monitors resource configurations and flags non-compliance or security risks, allowing you to detect and respond to potential issues like insecure configurations.

- Amazon CloudWatch: Used for monitoring and logging performance metrics across AWS resources. CloudWatch also captures custom logs and can be configured to alert you about anomalous behaviors, such as a spike in network traffic or unusual login patterns.

- AWS Macie: A data security service that automatically discovers and protects sensitive data (such as PII) stored in Amazon S3. Macie detects unauthorized access or accidental exposure of sensitive information and sends alerts.

# Response
Response involves taking immediate action to contain and remediate security incidents once they are detected. AWS provides automation and integration tools to streamline the incident response process, ensuring rapid action against potential threats.

## AWS response tools
- AWS Lambda: Lambda can be triggered to automatically run remediation actions in response to specific security events. For example, it can be used to quarantine compromised instances, revoke access, or remediate misconfigurations.

- Amazon EventBridge: EventBridge integrates with services like GuardDuty and Security Hub to route security findings and events to appropriate response actions. You can create event rules that trigger workflows or alerts in case of security incidents.

- AWS Systems Manager: Systems Manager provides runbooks and automation scripts that help teams manage and remediate issues. In a security incident, you can use predefined automation documents (SSM Automation) to handle incident response tasks, such as collecting forensic data or applying patches.

- AWS Step Functions: This service coordinates workflows and integrates multiple AWS services. It can be used to automate multi-step response processes, such as isolating resources, notifying security teams, and performing forensic analysis.

- Amazon Inspector: Automatically assesses the security vulnerabilities of your AWS resources and provides recommendations for patching or remediation. If vulnerabilities are found, automated responses can be triggered to patch or remediate the affected resources.

## Security Monitoring
Security Hub eliminates the complexity of addressing large volumes of findings from multiple providers. It reduces the effort required to manage and improve the security of all of your AWS accounts, resources, and workloads. Traditionally, when combining security alerts into a single system, you need to parse and normalize each data source to get it into a common format for search, analytics, and response and remediation actions. Security Hub eliminates these time consuming and resource intensive processes by introducing the AWS Security Findings Format (ASFF).

## Findings in Security Hub
With the ASFF, all Security Hub integration partners (including both AWS services and external partners) send their findings to Security Hub in a well-typed JSON format consisting of over 1,000 available fields. This means that all of your security findings are normalized before they are ingested into Security Hub, and you don’t need to do any parsing or normalization yourself. The findings identify resources, severities, and timestamps in a consistent way, so you can search and take action on them.

## Manageing product integrations
The integrations page in the AWS Management Console provides access to all available AWS and third-party product integrations. With the exception of sensitive data findings from Amazon Macie, you're automatically opted in to all other AWS service integrations with Security Hub. If you've turned on Security Hub and the other service, no other step is needed to activate the integration between the two.

## Automated response, remediation and enrichment actions
You can create custom automated response, remediation, and enrichment workflows using the Security Hub integration with EventBridge. All Security Hub findings are automatically sent to EventBridge. You can create EventBridge rules that have AWS Lambda functions, AWS Step Functions, or AWS Systems Manager Automation runbooks as their targets. These functions, or runbooks, can automatically enrich findings with additional data or take automated response and remediation actions on the findings.

## Security Hub Automated Response and Remediation (SHARR)
Security Hub also supports sending findings to EventBridge on demand through custom actions, so that you can have an analyst decide when to initiate an automated response or remediation action. The SHARR solution provides you with prepackaged EventBridge rules to deploy with AWS CloudFormation.

## Domits website monitoring system
The monitoring system for the Domits website is implemented using AWS services to ensure timely detection and notification of any downtime or service interruptions. This system integrates Route 53, CloudWatch, and SNS to provide a automated alert mechanism.

## How it works
Route 53 Health Check: Monitors the availability of the website (www.domits.com) by performing periodic HTTP or HTTPS checks.
The health check evaluates the website’s status from multiple global regions, ensuring comprehensive coverage and reliability.
If the website becomes unreachable (e.g., network issues, server failures), the health check status changes to Unhealthy.

CloudWatch Alarm:
Tracks the HealthCheckStatus metric from Route 53.
When the status indicates downtime (value = 0), the alarm is triggered.

Amazon SNS (Simple Notification Service):
Sends real-time notifications to designated recipients when the CloudWatch alarm is triggered.
Notifications are delivered via email and SMS to ensure critical alerts reach the team promptly.

## Key features
Automated Downtime Detection:
The system continuously monitors the website without manual intervention.

Immediate Alerts:
SNS ensures alerts are promptly delivered to administrators, minimizing response time to resolve issues.

Scalable Design:
The solution is built to handle additional endpoints or services if needed in the future.

## AWS services used
Route 53:
Provides health checks to monitor the availability of the website.

CloudWatch:
Hosts the alarms that respond to health check metrics, offering detailed monitoring and logging capabilities.

SNS (Simple Notification Service):
Sends notifications triggered by CloudWatch alarms to designated recipients.