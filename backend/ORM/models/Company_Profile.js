import { EntitySchema } from "typeorm";

const bigintTransformer = {
  from: (value) => value !== null && value !== undefined ? Number(value) : null,
  to: (value) => value,
};

export const Company_Profile = new EntitySchema({
  name: "Company_Profile",
  tableName: "company_profile",
  columns: {
    host_id: { primary: true, type: "varchar", nullable: false },
    company_name: { type: "varchar", nullable: false },
    display_name: { type: "varchar", nullable: true },
    logo_url: { type: "varchar", nullable: true },
    description: { type: "varchar", nullable: true },
    website: { type: "varchar", nullable: true },
    public_email: { type: "varchar", nullable: true },
    public_phone: { type: "varchar", nullable: true },
    country: { type: "varchar", nullable: true },
    created_at: { type: "bigint", nullable: false, transformer: bigintTransformer },
    updated_at: { type: "bigint", nullable: false, transformer: bigintTransformer },
  },
});
