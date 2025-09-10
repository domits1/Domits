# What is MFA?
AWS multi-factor authentication (MFA) is an AWS Identity and Access Management (IAM) best practice that requires a second authentication factor in addition to user name and password sign-in credentials. You can enable MFA at the AWS account level for root and IAM users you have created in your account.  
 
AWS is expanding eligibility for its free MFA security key program. Verify your eligibility and order your free MFA key.
 
With MFA enabled, when a user signs in to the AWS Management Console, they are prompted for their user name and password— something they know—and an authentication code from their MFA device— something they have (or if they use a biometrics-enabled authenticator, something they are). Taken together, these factors improve security for your AWS accounts and resources.
 
We recommend that you require your human users to use temporary credentials when accessing AWS. Your users can use an identity provider to federate into AWS, where they can authenticate with their corporate credentials and MFA configurations. To manage access to AWS and business applications, we recommend that you use AWS IAM Identity Center. For more information, see the IAM Identity Center User Guide.
 
See the following available MFA options that you can use with your IAM MFA implementation. You can download virtual authenticator apps through the links provided, or you can acquire a hardware MFA device from the respective manufacturer. After you've acquired a supported virtual or hardware MFA device, AWS does not charge additional fees for using MFA.

## Available MFA methods for IAM
You can manage your MFA devices in the IAM console. The following options are the MFA methods that IAM supports.

## Passkeys and security keys
Passkeys and security keys are based on FIDO standards to provide easier and more secure sign-ins across your user’s devices. FIDO authentication standards are based on public key cryptography, which enables strong, phishing-resistant authentication that is more secure than passwords. Passkeys are created with your chosen passkey provider such as iCloud Keychain, Google Password Manager, 1Password, or Dashlane using your fingerprint, face, or device PIN, and they are synced across your devices to sign-in with AWS. Customers can also use device-bound passkeys, also known as security keys, provided by third-party providers such as Yubico. The FIDO Alliance maintains a list of all FIDO-certified products that are compatible with FIDO specifications. FIDO security keys can support multiple root accounts and IAM users using a single security key. Passkeys and security keys are supported for root and IAM users in all AWS Regions, except the AWS China (Beijing) Region, operated by Sinnet, and the AWS (Ningxia) Region, operated by NWCD. For more information about enabling FIDO security keys, see Enabling a passkey or security key.

AWS offers a free MFA security key to eligible AWS account owners in the United States. To determine eligibility and order a key, see the Security Hub console.

## Virtual authenticator apps
Virtual authenticator apps implement the time-based one-time password (TOTP) algorithm and support multiple tokens on a single device. Virtual authenticators are supported for IAM users in the AWS GovCloud (US) Regions and in other AWS Regions. For more information about enabling virtual authenticators, see Enabling a virtual multi-factor authentication (MFA) device.

You can install apps for your smartphone from the app store that is specific to your type of smartphone. Some app providers also have web and desktop applications available. See the following table for examples.

Android: Twilio Authy Authenticator, Duo Mobile, Microsoft Authenticator, Google Authenticator, Symantec VIP.

IOS: Twilio Authy Authenticator, Duo Mobile, Microsoft Authenticator, Google Authenticator, Symantec VIP.

## Hardware TOTP tokens
Hardware tokens also support the TOTP algorithm and are provided by Thales, a third-party provider. These tokens are for use exclusively with AWS accounts. For more information, see Enabling a hardware MFA device.

To ensure compatibility with AWS, you must purchase your MFA tokens through the links on this page. Tokens purchased from other sources might not function with IAM because AWS requires unique “token seeds,” secret keys generated at the time of token production. Only tokens purchased through the links on this page have their token seeds shared securely with AWS. The MFA tokens are offered in two forms: the OTP token and the OTP display card.



