import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import JobDetails from "../../../pages/careers/jobDetails";
import Jobs from "../../../pages/careers/jobs.json";

const robotsContent = () => document.head.querySelector('meta[name="robots"]')?.getAttribute("content") || null;

const renderJob = (id) =>
  render(
    <MemoryRouter initialEntries={[`/job/${id}`]}>
      <Routes>
        <Route path="/job/:id" element={<JobDetails />} />
      </Routes>
    </MemoryRouter>
  );

describe("a job vacancy that does not exist", () => {
  afterEach(() => {
    document.head.querySelectorAll("meta").forEach((element) => element.remove());
  });

  it("asks search engines not to index the not found page", () => {
    renderJob("999999");

    expect(screen.getByText("Job not found")).toBeInTheDocument();
    expect(robotsContent()).toBe("noindex");
  });

  it("leaves a real vacancy indexable", () => {
    const existingJob = Jobs[0];

    renderJob(String(existingJob.id));

    expect(screen.queryByText("Job not found")).not.toBeInTheDocument();
    expect(robotsContent()).toBeNull();
  });
});
