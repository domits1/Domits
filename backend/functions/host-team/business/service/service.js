import { Repository } from "../../data/repository.js";
import { BadRequestException } from "../../util/exception/badRequestException.js";
import { ForbiddenException } from "../../util/exception/forbiddenException.js";
import { NotFoundException } from "../../util/exception/notFoundException.js";
import { sendTeamInviteEmail } from "../emailService.js";
import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import Database from "database";

const cognitoClient = new CognitoIdentityProviderClient({ region: "eu-north-1" });
const USER_POOL_ID = "eu-north-1_mPxNhvSFX";

export class Service {
    constructor() {
        this.repository = new Repository();
    }

    async getTeamMembers(hostId) {
        const dataSource = await Database.getInstance();
        return await this.repository.findByHostId(dataSource, hostId);
    }

    async inviteMember(hostId, hostEmail, email, role) {
        if (!email) throw new BadRequestException("Email is required.");

        const dataSource = await Database.getInstance();

        const existing = await this.repository.findByHostAndEmail(dataSource, hostId, email);
        if (existing && existing.status !== "revoked") {
            throw new BadRequestException("This email address has already been invited.");
        }

        const record = {
            host_id: hostId,
            member_email: email,
            role: role || "Property Operations Manager",
            status: "pending",
            invited_at: Date.now(),
        };

        const created = await this.repository.create(dataSource, record);
        await sendTeamInviteEmail(email, created.invite_token, hostEmail);

        return created;
    }

    async removeMember(hostId, memberId) {
        const dataSource = await Database.getInstance();

        const member = await this.repository.findById(dataSource, memberId);
        if (!member) throw new NotFoundException("Team member not found.");
        if (member.host_id !== hostId) throw new ForbiddenException("You do not have permission to remove this team member.");

        await this.repository.delete(dataSource, memberId);
        return { message: "Team member removed." };
    }

    async acceptInvite(token, pomUserId, pomEmail) {
        if (!token) throw new BadRequestException("Invite token is required.");

        const dataSource = await Database.getInstance();

        const invite = await this.repository.findByToken(dataSource, token);
        if (!invite) throw new NotFoundException("Invalid or expired invite token.");
        if (invite.status !== "pending") throw new BadRequestException("This invite has already been used or is no longer valid.");

        if (invite.member_email.toLowerCase() !== pomEmail.toLowerCase()) {
            throw new ForbiddenException("This invite was sent to a different email address.");
        }

        await this.repository.update(dataSource, invite.id, {
            member_user_id: pomUserId,
            status: "active",
            accepted_at: Date.now(),
        });

        try {
            await cognitoClient.send(new AdminUpdateUserAttributesCommand({
                UserPoolId: USER_POOL_ID,
                Username: pomUserId,
                UserAttributes: [{ Name: "custom:group", Value: invite.role }],
            }));
        } catch {
        }

        return { message: "Invite accepted. You now have access to the host's properties." };
    }
}
