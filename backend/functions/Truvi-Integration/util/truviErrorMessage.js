const hasStatus = (error) => error?.status !== null && error?.status !== undefined;

export const truviErrorMessage = (error, knownReasons = []) => {
  if (!hasStatus(error)) {
    return "Truvi did not answer";
  }
  if (error.status >= 500) {
    return `Truvi failed with status ${error.status}`;
  }
  const text = String(error.message ?? "").toLowerCase();
  const reason = knownReasons.find((known) => text.includes(known));
  return reason ? `Truvi refused: ${reason}` : `Truvi refused the request with status ${error.status}`;
};
