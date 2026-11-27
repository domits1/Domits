import { BadRequestException } from "../../util/exception/badRequestException.js";

export const ALLOWED_DOCUMENT_TYPES = Object.freeze({
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
});

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

const BYTES_PER_MEGABYTE = 1024 * 1024;
const WHOLE_BYTES = /^\d{1,12}$/;

const listTypeLabels = () => {
  const labels = Object.values(ALLOWED_DOCUMENT_TYPES).map((extension) => extension.toUpperCase());
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
};

const readExtension = (fileType) => {
  const isAllowedType = typeof fileType === "string" && Object.hasOwn(ALLOWED_DOCUMENT_TYPES, fileType);
  if (!isAllowedType) {
    throw new BadRequestException(`Only ${listTypeLabels()} files can be uploaded. Choose a file of one of these types.`);
  }
  return ALLOWED_DOCUMENT_TYPES[fileType];
};

const readSize = (fileSize) => {
  if (typeof fileSize !== "string" || !WHOLE_BYTES.test(fileSize)) {
    throw new BadRequestException("fileSize must be the size of the file in bytes.");
  }
  const size = Number(fileSize);
  if (size === 0) {
    throw new BadRequestException("An empty file cannot be uploaded. Choose a file that has content.");
  }
  if (size > MAX_DOCUMENT_BYTES) {
    throw new BadRequestException(
      `A document can be at most ${MAX_DOCUMENT_BYTES / BYTES_PER_MEGABYTE} MB. Choose a smaller file.`
    );
  }
  return size;
};

export const validateUpload = (fileType, fileSize) => {
  const extension = readExtension(fileType);
  return { contentType: fileType, contentLength: readSize(fileSize), extension };
};
