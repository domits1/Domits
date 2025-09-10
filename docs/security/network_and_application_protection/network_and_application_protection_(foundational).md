# Network and Application protection in AWS
AWS provides a layered approach to protect networks and applications. You isolate resources in Amazon VPC, control traffic with security groups and network ACLs, inspect/filter at the edge with AWS WAF, AWS Shield, and Amazon CloudFront, and enforce organization-wide guardrails with AWS Firewall Manager.

## VPC security groups
A security group controls the traffic that is allowed to reach and leave the resources that it is associated with. For example, after you associate a security group with an EC2 instance, it controls the inbound and outbound traffic for the instance.

When you create a VPC, it comes with a default security group. You can create additional security groups for a VPC, each with their own inbound and outbound rules. You can specify the source, port range, and protocol for each inbound rule. You can specify the destination, port range, and protocol for each outbound rule.

## Network ACLs (NACLs)
A network access control list (ACL) allows or denies specific inbound or outbound traffic at the subnet level. You can use the default network ACL for your VPC, or you can create a custom network ACL for your VPC with rules that are similar to the rules for your security groups in order to add an additional layer of security to your VPC.

## AWS Network Firewall
AWS Network Firewall helps you protect your Amazon VPCs with automated, intelligence-driven network security. Create granular rules to control traffic and automatically block active threats using AWS managed rules powered by Amazon threat intelligence. Deploy AWS Network Firewall across your VPCs for consistent protection through features like geographic IP filtering, deep packet inspection, and advanced intrusion prevention capabilities. AWS Network Firewall scales automatically to help defend your workloads while reducing operational overhead.

## Amazon Route 53 Resolver DNS Firewall
Amazon Route 53 provides highly available and scalable Domain Name System (DNS), domain name registration, and health-checking web services. It is designed to give developers and businesses an extremely reliable and cost effective way to route end users to Internet applications by translating names like example.com into the numeric IP addresses, such as 192.0.2.1, that computers use to connect to each other. You can combine your DNS with health-checking services to route traffic to healthy endpoints or to independently monitor and/or alarm on endpoints. You can also purchase and manage domain names such as example.com and automatically configure DNS settings for your domains. Route 53 effectively connects user requests to infrastructure running in AWS – such as Amazon EC2 instances, Elastic Load Balancing load balancers, or Amazon S3 buckets – and can also be used to route users to infrastructure outside of AWS.

## AWS Firewall Manager
AWS Firewall Manager is a central policy service that lets you define, deploy, and enforce network and application security controls across multiple AWS accounts and resources. From one place, you can apply and auto-maintain policies for AWS WAF, AWS Shield Advanced, AWS Network Firewall, Route 53 Resolver DNS Firewall, and VPC security groups. It automatically includes new accounts/resources, monitors compliance, and can remediate drift—giving consistent, organization-wide protection with minimal manual setup.

## AWS Shield

AWS Shield protects networks and applications by identifying network security configuration issues and defending applications against active web exploitation and distributed denial of service (DDoS) events. AWS Shield does this by offering two key capabilities: 

- AWS Shield network security director performs an analysis of your resources to help you visualize your network topology, identify configuration issues, and receive actionable remediation recommendations.

- AWS Shield Advanced offers managed DDoS protection for continuous automatic mitigation of sophisticated DDoS events to minimize application downtime and latency. You can customize your DDoS protection strategy using application-specific security controls and expert guidance from the Shield Response Team during active DDoS incidents. 