import { revealDeferredSections } from "../rendering/animations/revealDeferredSections";

const buildDocument = () => {
  const root = document.createElement("div");
  root.innerHTML = `
    <section class="deferred" id="gallery"></section>
    <section class="plain" id="hero"></section>
    <section class="deferred" id="availability"></section>
  `;
  return root;
};

describe("revealDeferredSections", () => {
  it("marks every deferred section as revealed and leaves other sections alone", () => {
    const root = buildDocument();

    const revealedCount = revealDeferredSections(root, "deferred", "revealed");

    expect(revealedCount).toBe(2);
    expect(root.querySelector("#gallery").classList.contains("revealed")).toBe(true);
    expect(root.querySelector("#availability").classList.contains("revealed")).toBe(true);
    expect(root.querySelector("#hero").classList.contains("revealed")).toBe(false);
  });

  it("is idempotent across repeated navigations", () => {
    const root = buildDocument();

    revealDeferredSections(root, "deferred", "revealed");
    revealDeferredSections(root, "deferred", "revealed");

    expect(root.querySelector("#gallery").className).toBe("deferred revealed");
  });

  it("does nothing without a root or class names", () => {
    expect(revealDeferredSections(null, "deferred", "revealed")).toBe(0);
    expect(revealDeferredSections(buildDocument(), "", "revealed")).toBe(0);
    expect(revealDeferredSections(buildDocument(), "deferred", "")).toBe(0);
  });
});
