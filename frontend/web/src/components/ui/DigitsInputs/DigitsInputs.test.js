import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import DigitInputs from "./DigitsInputs";

const renderDigits = (props = {}) => {
  const inputRef = { current: [] };
  render(<DigitInputs amount={6} inputRef={inputRef} {...props} />);
  return { inputRef, inputs: screen.getAllByRole("textbox") };
};

const fillCode = (inputs, code) => {
  code.split("").forEach((digit, index) => fireEvent.change(inputs[index], { target: { value: digit } }));
};

describe("DigitInputs", () => {
  it("accepts input without an onComplete callback", () => {
    const { inputs } = renderDigits();

    expect(() => fireEvent.change(inputs[0], { target: { value: "7" } })).not.toThrow();
    expect(inputs[0]).toHaveValue("7");
  });

  it("clears a non-digit character even when no callback is given", () => {
    const { inputs } = renderDigits();

    fireEvent.change(inputs[2], { target: { value: "x" } });

    expect(inputs[2]).toHaveValue("");
  });

  it("reports false while incomplete and the full code once every digit is filled", () => {
    const onComplete = jest.fn();
    const { inputs } = renderDigits({ onComplete });

    fillCode(inputs, "12345");
    expect(onComplete).toHaveBeenLastCalledWith(false);

    fireEvent.change(inputs[5], { target: { value: "6" } });
    expect(onComplete).toHaveBeenLastCalledWith("123456");
  });

  it("fills every box and reports the code when a complete code is pasted", () => {
    const onComplete = jest.fn();
    const { inputs } = renderDigits({ onComplete });

    fireEvent.paste(inputs[0], { clipboardData: { getData: () => "987654" } });

    expect(inputs.map((input) => input.value).join("")).toBe("987654");
    expect(onComplete).toHaveBeenCalledWith("987654");
  });
});
