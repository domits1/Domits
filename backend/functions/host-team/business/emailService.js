import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({ region: "eu-north-1" });

const FRONTEND_URL = "https://domits.com";

export const sendTeamInviteEmail = async (toEmail, inviteToken, hostEmail, role) => {
    const acceptLink = `${FRONTEND_URL}/team/accept?token=${inviteToken}`;

    const payload = {
        body: {
            toEmail,
            subject: `Je bent uitgenodigd voor een team op Domits`,
            body: `Hallo,

Je bent uitgenodigd als ${role} op Domits.

Met deze rol krijg je toegang tot het hostdashboard van deze host.

Klik op de onderstaande link om de uitnodiging te accepteren:
${acceptLink}

Deze link is persoonlijk en mag niet worden gedeeld.

Met vriendelijke groet,
Het Domits Team`
        }
    };

    try {
        await lambdaClient.send(new InvokeCommand({
            FunctionName: "EmailNotificationService",
            Payload: JSON.stringify(payload),
        }));
    } catch {
    }
};
