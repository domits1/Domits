import React from "react";
import { act, render } from "@testing-library/react";
import { useWebsiteScrollReveal } from "../rendering/animations/useWebsiteScrollReveal";
import motionStyles from "../rendering/animations/WebsiteTemplateMotion.module.scss";

const VISIBLE = motionStyles.scrollRevealVisible;
const SETTLED = motionStyles.scrollRevealSettled;

function RevealCanvas() {
  const canvasRef = useWebsiteScrollReveal({ enabled: true });
  return (
    <div ref={canvasRef}>
      <section data-scroll-reveal="true" data-testid="first">
        <img alt="" data-testid="child" />
      </section>
      <section data-scroll-reveal="true" data-testid="second" />
    </div>
  );
}

const installFakeIntersectionObserver = () => {
  const observers = [];
  class FakeIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
      this.observed = new Set();
      observers.push(this);
    }
    observe(target) {
      this.observed.add(target);
    }
    unobserve(target) {
      this.observed.delete(target);
    }
    disconnect() {
      this.observed.clear();
    }
    intersect(target) {
      this.callback([{ target, isIntersecting: true }], this);
    }
  }
  global.IntersectionObserver = FakeIntersectionObserver;
  return observers;
};

const fireTransitionEnd = (element) => {
  act(() => {
    element.dispatchEvent(new Event("transitionend", { bubbles: true }));
  });
};

describe("useWebsiteScrollReveal", () => {
  afterEach(() => {
    delete global.IntersectionObserver;
  });

  it("reveals and settles every target immediately when nothing can animate", () => {
    const { getByTestId } = render(<RevealCanvas />);

    expect(getByTestId("first").classList.contains(VISIBLE)).toBe(true);
    expect(getByTestId("first").classList.contains(SETTLED)).toBe(true);
    expect(getByTestId("second").classList.contains(SETTLED)).toBe(true);
  });

  it("reveals on intersection and settles only once the target's own transition ends", () => {
    const observers = installFakeIntersectionObserver();
    const { getByTestId } = render(<RevealCanvas />);
    const first = getByTestId("first");

    act(() => {
      observers[0].intersect(first);
    });
    expect(first.classList.contains(VISIBLE)).toBe(true);
    expect(first.classList.contains(SETTLED)).toBe(false);

    fireTransitionEnd(getByTestId("child"));
    expect(first.classList.contains(SETTLED)).toBe(false);

    fireTransitionEnd(first);
    expect(first.classList.contains(SETTLED)).toBe(true);
    expect(getByTestId("second").classList.contains(VISIBLE)).toBe(false);
  });

  it("stops listening for transitions on unmount", () => {
    const observers = installFakeIntersectionObserver();
    const { getByTestId, unmount } = render(<RevealCanvas />);
    const first = getByTestId("first");
    act(() => {
      observers[0].intersect(first);
    });

    unmount();
    first.dispatchEvent(new Event("transitionend", { bubbles: true }));

    expect(first.classList.contains(SETTLED)).toBe(false);
  });
});
