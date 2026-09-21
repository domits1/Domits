import { CompanyProfileRepository } from "../../data/repository.js";
import { CompanyLogoRepository } from "../../data/logoRepository.js";
import { badRequest } from "../../util/httpErrors.js";

const ALLOWED_PROFILE_FIELDS = new Set([
  "companyName",
  "displayName",
  "logoUrl",
  "description",
  "website",
  "publicEmail",
  "publicPhone",
  "country",
]);

const SPOOFED_HOST_ID_KEYS = new Set(["hostId", "host_id"]);

const MAX_LENGTHS = {
  companyName: 200,
  displayName: 200,
  logoUrl: 1000,
  description: 1000,
  website: 500,
  publicEmail: 254,
  publicPhone: 30,
  country: 100,
};

// /i already covers case, so the character classes only need one case (no a-zA-Z duplication).
const WEBSITE_PATTERN = /^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+([/?#]\S*)?$/i;
// The final segment excludes "." so the mandatory "\." can only match the last dot in the
// string; allowing "." on both sides of it let the engine retry every dot position on
// failure (O(n^2) on crafted input).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@.]+$/;
const PHONE_PATTERN = /^\+?[0-9\s().-]{6,20}$/;

export const isValidWebsite = (value) => WEBSITE_PATTERN.test(value);
export const isValidEmail = (value) => EMAIL_PATTERN.test(value);
export const isValidPhone = (value) => {
  if (!PHONE_PATTERN.test(value)) return false;
  const digitCount = value.replace(/\D/g, "").length;
  return digitCount >= 6 && digitCount <= 15;
};

export class CompanyProfileService {
  constructor({
    repository = new CompanyProfileRepository(),
    logoRepository = new CompanyLogoRepository(),
    now = () => Date.now(),
  } = {}) {
    this.repository = repository;
    this.logoRepository = logoRepository;
    this.now = now;
  }

  async getCompanyProfile(hostId) {
    const record = await this.repository.findByHostId(hostId);
    if (!record) return this.emptyProfile();
    return this.toApi(record);
  }

  async updateCompanyProfile(hostId, payload) {
    const profile = this.validateProfile(payload);
    const existing = await this.repository.findByHostId(hostId);
    const now = this.now();

    const record = {
      host_id: hostId,
      ...this.toRecordColumns(profile),
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };

    await this.repository.save(record);
    return this.toApi(record);
  }

  async createLogoUploadUrl(hostId, contentType) {
    if (!contentType) throw badRequest("fileType is required.");
    if (!this.logoRepository.isAllowedContentType(contentType)) {
      throw badRequest("Logo must be a JPEG, PNG, or WebP image.");
    }
    return await this.logoRepository.createPresignedUpload(hostId, contentType);
  }

  validateProfile(payload) {
    this.assertPlainObject(payload);
    this.assertKnownFields(payload);

    const companyName = String(payload.companyName || "").trim();
    if (!companyName) {
      throw badRequest("companyName is required.");
    }
    this.assertMaxLength("companyName", companyName);

    const profile = { companyName };

    for (const field of ["displayName", "logoUrl", "description", "country"]) {
      profile[field] = this.extractPlainField(payload, field);
    }

    profile.website = this.extractFormattedField(payload, "website", isValidWebsite, "website must be a valid URL.");
    profile.publicEmail = this.extractFormattedField(
      payload,
      "publicEmail",
      isValidEmail,
      "publicEmail must be a valid email address."
    );
    profile.publicPhone = this.extractFormattedField(
      payload,
      "publicPhone",
      isValidPhone,
      "publicPhone must be a valid phone number."
    );

    return profile;
  }

  assertPlainObject(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw badRequest("Request body must be a company profile object.");
    }
  }

  assertKnownFields(payload) {
    for (const key of Object.keys(payload)) {
      if (SPOOFED_HOST_ID_KEYS.has(key)) {
        throw badRequest("hostId must not be provided for the company profile.");
      }
      if (!ALLOWED_PROFILE_FIELDS.has(key)) {
        throw badRequest(`Unknown company profile field: ${key}.`);
      }
    }
  }

  extractPlainField(payload, field) {
    const value = Object.hasOwn(payload, field) ? String(payload[field] || "").trim() : "";
    this.assertMaxLength(field, value);
    return value;
  }

  extractFormattedField(payload, field, isValidFormat, errorMessage) {
    const value = this.extractPlainField(payload, field);
    if (value && !isValidFormat(value)) {
      throw badRequest(errorMessage);
    }
    return value;
  }

  assertMaxLength(field, value) {
    const maxLength = MAX_LENGTHS[field];
    if (value.length > maxLength) {
      throw badRequest(`${field} must be ${maxLength} characters or fewer.`);
    }
  }

  emptyProfile() {
    return Object.fromEntries([...ALLOWED_PROFILE_FIELDS].map((field) => [field, ""]));
  }

  toApi(record) {
    return {
      companyName: record.company_name || "",
      displayName: record.display_name || "",
      logoUrl: record.logo_url || "",
      description: record.description || "",
      website: record.website || "",
      publicEmail: record.public_email || "",
      publicPhone: record.public_phone || "",
      country: record.country || "",
    };
  }

  toRecordColumns(profile) {
    return {
      company_name: profile.companyName,
      display_name: profile.displayName,
      logo_url: profile.logoUrl,
      description: profile.description,
      website: profile.website,
      public_email: profile.publicEmail,
      public_phone: profile.publicPhone,
      country: profile.country,
    };
  }
}
