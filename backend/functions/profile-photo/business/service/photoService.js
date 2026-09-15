import { randomUUID } from "node:crypto";
import { uploadPhoto } from "../../data/photoRepository.js";
import { BadRequestException } from "../../util/exception/badRequestException.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSION_BY_MIME_TYPE = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
};

export const uploadProfilePhoto = async (username, imageDataUrl) => {
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
        throw new BadRequestException("image is required.");
    }

    const matches = imageDataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
    if (!matches) {
        throw new BadRequestException("image must be a base64 image data URL.");
    }

    const [, contentType, base64Data] = matches;
    if (!ALLOWED_MIME_TYPES.has(contentType)) {
        throw new BadRequestException("Unsupported image type.");
    }

    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > MAX_BYTES) {
        throw new BadRequestException("Image must be 5MB or smaller.");
    }

    const key = `images/profile/${username}/${randomUUID()}.${EXTENSION_BY_MIME_TYPE[contentType]}`;
    const fileUrl = await uploadPhoto(key, buffer, contentType);

    return { fileUrl };
};
