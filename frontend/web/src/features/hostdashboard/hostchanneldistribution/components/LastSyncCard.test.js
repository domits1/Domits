import React from "react";
import { render, screen } from "@testing-library/react";
import LastSyncCard from "./LastSyncCard";

describe("LastSyncCard", () => {
  test("renders a No sync yet state when item is null", () => {
    render(<LastSyncCard syncEvidence={{ item: null }} />);

    expect(screen.getByText("No sync yet")).toBeInTheDocument();
  });

  test("renders a green Synced badge when overallSuccess is true", () => {
    render(
      <LastSyncCard
        syncEvidence={{ item: { overallSuccess: true, finishedAt: 1758700005000 } }}
      />
    );

    expect(screen.getByText("Synced")).toBeInTheDocument();
  });

  test("renders a red Failed badge when overallSuccess is false", () => {
    render(
      <LastSyncCard
        syncEvidence={{ item: { overallSuccess: false, finishedAt: 1758700102000 } }}
      />
    );

    expect(screen.getByText("Failed")).toBeInTheDocument();
  });
});
