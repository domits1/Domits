import { afterEach, describe, expect, it, jest } from "@jest/globals";
import {
  EXISTING_SITE_RENDER_BODY,
  EXISTING_SITE_RENDER_QUERIES,
  buildExistingSiteController,
  buildRatePlanRepository,
  expectNoPlanRead,
  renderEvent,
} from "./support/existingSiteRender.js";

afterEach(() => {
  jest.restoreAllMocks();
});

describe("the public render of an existing site without page settings", () => {
  it.each(EXISTING_SITE_RENDER_QUERIES)(
    "answers byte for byte the stored acceptance response and reads no plan, by %s",
    async (_label, query) => {
      const consoleError = jest.spyOn(console, "error");
      const ratePlanRepository = buildRatePlanRepository();
      const controller = buildExistingSiteController({ ratePlanRepository });

      const response = await controller.getPublicWebsiteRenderModel(renderEvent(query));

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe(EXISTING_SITE_RENDER_BODY);
      expectNoPlanRead(ratePlanRepository);
      expect(consoleError).not.toHaveBeenCalled();
    }
  );
});
