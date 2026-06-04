import { EntitySchema } from "typeorm";

const bigintTransformer = {
    from: (value) => value !== null && value !== undefined ? Number(value) : null,
    to: (value) => value,
};

export const Team_Member = new EntitySchema({
    name: "Team_Member",
    tableName: "team_member",
    columns: {
        id: { primary: true, type: "uuid", generated: "uuid" },
        host_id: { type: "varchar", nullable: false },
        member_email: { type: "varchar", nullable: false },
        member_user_id: { type: "varchar", nullable: true },
        role: { type: "varchar", nullable: false, default: "Property Operations Manager" },
        status: { type: "varchar", nullable: false, default: "pending" },
        invite_token: { type: "uuid", generated: "uuid", nullable: false, unique: true },
        invited_at: { type: "bigint", nullable: false, transformer: bigintTransformer },
        accepted_at: { type: "bigint", nullable: true, transformer: bigintTransformer },
    }
});
