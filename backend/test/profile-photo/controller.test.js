import { Controller } from "../../functions/profile-photo/controller/controller.js";
import { AuthManager } from "../../functions/profile-photo/auth/authManager.js";
import * as photoService from "../../functions/profile-photo/business/service/photoService.js";
import { UnauthorizedException } from "../../functions/profile-photo/util/exception/unauthorizedException.js";

describe("profile-photo Controller - uploadPhoto", () => {
  let controller;

  beforeEach(() => {
    controller = new Controller();
    jest.restoreAllMocks();
  });

  test("returns 401 when the access token is invalid", async () => {
    jest.spyOn(AuthManager.prototype, "getUsername").mockRejectedValue(
      new UnauthorizedException("Invalid or expired authorization token.")
    );

    const response = await controller.uploadPhoto({
      headers: { Authorization: "bad-token" },
      body: JSON.stringify({ image: "data:image/png;base64,abc" }),
    });

    expect(response.statusCode).toBe(401);
  });

  test("returns 400 when image is missing from the body", async () => {
    jest.spyOn(AuthManager.prototype, "getUsername").mockResolvedValue("user-123");

    const response = await controller.uploadPhoto({
      headers: { Authorization: "good-token" },
      body: JSON.stringify({}),
    });

    expect(response.statusCode).toBe(400);
  });

  test("returns 200 with the fileUrl on success", async () => {
    jest.spyOn(AuthManager.prototype, "getUsername").mockResolvedValue("user-123");
    jest.spyOn(photoService, "uploadProfilePhoto").mockResolvedValue({
      fileUrl: "https://accommodation.s3.eu-north-1.amazonaws.com/profile/user-123/abc.png",
    });

    const response = await controller.uploadPhoto({
      headers: { Authorization: "good-token" },
      body: JSON.stringify({ image: "data:image/png;base64,abc" }),
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      fileUrl: "https://accommodation.s3.eu-north-1.amazonaws.com/profile/user-123/abc.png",
    });
    expect(photoService.uploadProfilePhoto).toHaveBeenCalledWith("user-123", "data:image/png;base64,abc");
  });
});
