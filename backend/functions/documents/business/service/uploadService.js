import { randomUUID } from "node:crypto";
import { validateUpload } from "../validation/uploadValidator.js";
import { StorageRepository } from "../../data/storageRepository.js";

const DOCUMENT_FOLDER = "documents";

export class UploadService {
  constructor({ storageRepository = new StorageRepository() } = {}) {
    this.storageRepository = storageRepository;
  }

  async createUploadUrl(hostId, fileType, fileSize) {
    const file = validateUpload(fileType, fileSize);
    const key = `${DOCUMENT_FOLDER}/${hostId}/${randomUUID()}.${file.extension}`;
    const uploadUrl = await this.storageRepository.createUploadUrl(key, file.contentType, file.contentLength);
    return { uploadUrl, key };
  }
}
