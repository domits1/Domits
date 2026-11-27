import { Controller } from "../../functions/documents/controller/controller.js";
import { BadRequestException } from "../../functions/documents/util/exception/badRequestException.js";
import { UnauthorizedException } from "../../functions/documents/util/exception/unauthorizedException.js";

const TOKEN_USER = "token-user-1";
const UPLOAD = Object.freeze({ uploadUrl: "https://signed.example/upload", key: "documents/token-user-1/a.pdf" });
const GENERIC_ERROR = { message: "Something went wrong, please contact support." };

const uploadEvent = ({ headers = { Authorization: "access-token-1" }, query = {} } = {}) => ({
  httpMethod: "GET",
  headers,
  queryStringParameters: { action: "upload-url", fileType: "application/pdf", fileSize: "4096", ...query },
});

const controllerFor = ({ role = "Host", getUser, createUploadUrl } = {}) => {
  const authManager = { getUser: getUser ?? jest.fn().mockResolvedValue({ userId: TOKEN_USER, role }) };
  const uploadService = { createUploadUrl: createUploadUrl ?? jest.fn().mockResolvedValue(UPLOAD) };
  return { controller: new Controller({ authManager, uploadService }), authManager, uploadService };
};

const bodyOf = (response) => JSON.parse(response.body);

afterEach(() => jest.restoreAllMocks());

describe("GET upload-url", () => {
  test.each(["Host", "Admin"])("gives a %s an upload link for their own folder", async (role) => {
    const { controller, authManager, uploadService } = controllerFor({ role });

    const response = await controller.getUploadUrl(uploadEvent());

    expect(response.statusCode).toBe(200);
    expect(bodyOf(response)).toEqual(UPLOAD);
    expect(authManager.getUser).toHaveBeenCalledWith("access-token-1");
    expect(uploadService.createUploadUrl).toHaveBeenCalledWith(TOKEN_USER, "application/pdf", "4096");
  });

  it("takes the host from the token, whatever host the query names", async () => {
    const { controller, uploadService } = controllerFor();
    const query = { hostId: "other-host", host_id: "other-host", asHostId: "other-host", userId: "other-host" };

    await controller.getUploadUrl(uploadEvent({ query }));

    expect(uploadService.createUploadUrl).toHaveBeenCalledTimes(1);
    expect(uploadService.createUploadUrl.mock.calls[0][0]).toBe(TOKEN_USER);
  });

  it("reads a lower-case authorization header", async () => {
    const { controller, authManager } = controllerFor();

    await controller.getUploadUrl(uploadEvent({ headers: { authorization: "access-token-2" } }));

    expect(authManager.getUser).toHaveBeenCalledWith("access-token-2");
  });

  test.each([null, "Guest", "Owner", "host", "ADMIN", "Admin ", "General Manager"])(
    "answers 403 to the group %p and asks for no link",
    async (role) => {
      const { controller, uploadService } = controllerFor({ role });

      const response = await controller.getUploadUrl(uploadEvent());

      expect(response.statusCode).toBe(403);
      expect(bodyOf(response)).toEqual({ message: "You must be a Host or Admin to manage documents." });
      expect(uploadService.createUploadUrl).not.toHaveBeenCalled();
    }
  );

  it("answers 401 when the token is refused, and asks for no link", async () => {
    const getUser = jest.fn().mockRejectedValue(new UnauthorizedException("Invalid or expired authorization token."));
    const { controller, uploadService } = controllerFor({ getUser });

    const response = await controller.getUploadUrl(uploadEvent({ headers: {} }));

    expect(response.statusCode).toBe(401);
    expect(bodyOf(response)).toEqual({ message: "Invalid or expired authorization token." });
    expect(uploadService.createUploadUrl).not.toHaveBeenCalled();
  });

  it("passes a refused file on with its reason", async () => {
    const createUploadUrl = jest.fn().mockRejectedValue(new BadRequestException("An empty file cannot be uploaded."));
    const { controller } = controllerFor({ createUploadUrl });

    const response = await controller.getUploadUrl(uploadEvent());

    expect(response.statusCode).toBe(400);
    expect(bodyOf(response)).toEqual({ message: "An empty file cannot be uploaded." });
  });

  it("logs a missing bucket setting and answers only the generic message", async () => {
    const failure = new Error("DOCUMENTS_BUCKET is not set");
    const createUploadUrl = jest.fn().mockRejectedValue(failure);
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    const { controller } = controllerFor({ createUploadUrl });

    const response = await controller.getUploadUrl(uploadEvent());

    expect(response.statusCode).toBe(500);
    expect(bodyOf(response)).toEqual(GENERIC_ERROR);
    expect(log).toHaveBeenCalledWith(failure);
  });

  it("answers CORS headers with every response", async () => {
    const { controller } = controllerFor({ role: "Guest" });

    const response = await controller.getUploadUrl(uploadEvent());

    expect(response.headers).toMatchObject({ "Access-Control-Allow-Origin": "*" });
  });
});
