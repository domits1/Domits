import { describe, it, expect, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";

const SUMMARY = { stored: 3, expected: 3, removed: 1, queued: 1, stuck: [], errors: [] };

describe("running the static page reconciler from the controller", () => {
  it("answers 200 with the summary, passes the limit on, and rejects when something failed or a site is stuck", async () => {
    const controller = new PropertyController();
    const reconciler = { run: jest.fn(async () => SUMMARY) };
    controller.createStaticPageReconciler = jest.fn(() => reconciler);

    const response = await controller.reconcileStaticPages({ task: "reconcile-static-pages", limit: 7 });

    expect(reconciler.run).toHaveBeenCalledWith({ limit: 7 });
    expect(response).toEqual({ statusCode: 200, body: JSON.stringify(SUMMARY) });

    reconciler.run.mockResolvedValueOnce({ ...SUMMARY, stuck: [{ siteId: "site-1", failureReason: "RENDER_FAILED" }] });
    await expect(controller.reconcileStaticPages({ task: "reconcile-static-pages" })).rejects.toThrow(
      "0 failures and 1 stuck"
    );
  });
});
