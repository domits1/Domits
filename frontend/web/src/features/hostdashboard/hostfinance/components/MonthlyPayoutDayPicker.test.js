import { fireEvent, render, screen } from "@testing-library/react";
import MonthlyPayoutDayPicker from "./MonthlyPayoutDayPicker";

describe("MonthlyPayoutDayPicker", () => {
  it("shows all 31 recurring payout days and the selected day", () => {
    render(<MonthlyPayoutDayPicker value={31} onChange={jest.fn()} />);

    expect(screen.getAllByRole("radio")).toHaveLength(31);
    expect(screen.getByRole("radio", { name: "31" })).toBeChecked();
    expect(screen.getByText("Payouts are scheduled on day 31 of every month.")).toBeInTheDocument();
  });

  it("passes the selected day to the change handler", () => {
    const onChange = jest.fn();
    render(<MonthlyPayoutDayPicker value={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: "15" }));

    expect(onChange).toHaveBeenCalledWith(15);
  });

  it("disables all day options when the picker is disabled", () => {
    render(<MonthlyPayoutDayPicker value={15} onChange={jest.fn()} disabled />);

    expect(screen.getByRole("radio", { name: "15" })).toBeDisabled();
  });
});
