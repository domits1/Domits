/* eslint-env jest */
// Shared by ConnectChannexModal.test.js and DisconnectChannexModal.test.js. Deliberately not named
// *.test.js, so Jest does not collect it as a suite of its own.
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Every way a host can dismiss a modal, as [label, action(user)] rows for test.each.
export const DISMISS_ACTIONS = [
  ["Cancel", (user) => user.click(screen.getByRole("button", { name: "Cancel" }))],
  ["Close", (user) => user.click(screen.getByRole("button", { name: "Close" }))],
  ["Escape", (user) => user.keyboard("{Escape}")],
  ["clicking the backdrop", (user) => user.click(screen.getByRole("button", { name: "Close backdrop" }))],
];

// A host must not be able to dismiss a modal mid-request, or they lose sight of the outcome.
// Runs one dismissal through: request in flight (a promise this function controls), dismissal is
// ignored, the request settles, and the same dismissal then closes the modal.
//   renderModal(onClose)  renders the modal wired to the given onClose spy
//   mockedRequest         the jest.fn the modal's submit calls
//   submitButtonName      accessible name of the button that starts the request
//   settledValue          what the request resolves with
//   beforeSubmit(user)    optional, e.g. typing into a field before submitting
export async function expectDismissalBlockedWhileInFlight({
  dismiss,
  renderModal,
  mockedRequest,
  submitButtonName,
  settledValue,
  beforeSubmit,
}) {
  const user = userEvent.setup();
  let settleRequest;
  mockedRequest.mockImplementation(() => new Promise((resolve) => (settleRequest = resolve)));
  const onClose = jest.fn();

  renderModal(onClose);

  if (beforeSubmit) await beforeSubmit(user);
  await user.click(screen.getByRole("button", { name: submitButtonName }));
  // The scenario only means something if the request really started; fail clearly if it did not.
  expect(mockedRequest).toHaveBeenCalledTimes(1);
  await dismiss(user);

  expect(onClose).not.toHaveBeenCalled();

  await act(async () => settleRequest(settledValue));
  await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled());
  await dismiss(user);

  expect(onClose).toHaveBeenCalledTimes(1);
}
