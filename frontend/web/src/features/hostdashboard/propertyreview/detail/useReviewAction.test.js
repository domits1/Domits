import { act, renderHook } from "@testing-library/react";
import useReviewAction from "./useReviewAction";

test("ignores a second submit made before the first has settled", async () => {
  let finish;
  const action = jest.fn(() => new Promise((resolve) => (finish = resolve)));
  const onSuccess = jest.fn();
  const { result } = renderHook(() =>
    useReviewAction({ action, onSuccess, onStale: jest.fn(), onWrongStatus: jest.fn() })
  );

  act(() => {
    result.current.submit();
    result.current.submit();
  });
  await act(async () => finish());

  expect(action).toHaveBeenCalledTimes(1);
  expect(onSuccess).toHaveBeenCalledTimes(1);
});
