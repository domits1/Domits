import { renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import usePersonalDataSave from "../../hooks/usePersonalDataSave";

const baseProps = () => ({
  user: {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "+31612345678",
    dateOfBirth: "01-01-1990",
    placeOfBirth: "Netherlands",
    nationality: "Dutch",
    title: "Mr.",
    sex: "Male",
  },
  tempUser: {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    dateOfBirth: "01-01-1990",
    placeOfBirth: "Netherlands",
    nationality: "Dutch",
    title: "Mr.",
    sex: "Male",
  },
  selectedCountryCode: "+31",
  stripPhone: "612345678",
  onSaveUserName: jest.fn().mockResolvedValue(),
  onSaveUserEmail: jest.fn().mockResolvedValue(),
  onSaveUserPhone: jest.fn().mockResolvedValue(),
  onSaveUserDateOfBirth: jest.fn().mockResolvedValue(),
  onSaveUserPlaceOfBirth: jest.fn().mockResolvedValue(),
  onSaveUserNationality: jest.fn().mockResolvedValue(),
  onSaveUserTitle: jest.fn().mockResolvedValue(),
  onSaveUserSex: jest.fn().mockResolvedValue(),
  onSaveProfileAttributes: jest.fn().mockResolvedValue(true),
});

const SINGLE_PROFILE_SAVE_KEYS = [
  "onSaveUserDateOfBirth",
  "onSaveUserPlaceOfBirth",
  "onSaveUserNationality",
  "onSaveUserTitle",
  "onSaveUserSex",
];

const createDeferred = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const changeNamePhoneAndEmail = (props) => {
  props.tempUser.firstName = "Jane";
  props.stripPhone = "687654321";
  props.tempUser.email = "jane@example.com";
};

const runSaveAll = async (props) => {
  const { result } = renderHook(() => usePersonalDataSave(props));
  await act(async () => {
    await result.current.saveAll();
  });
  return result;
};

describe("usePersonalDataSave", () => {
  test("does not call onSaveProfileAttributes when no profile field changed", async () => {
    const props = baseProps();

    await runSaveAll(props);

    expect(props.onSaveProfileAttributes).not.toHaveBeenCalled();
  });

  test("calls onSaveProfileAttributes with title when tempUser.title differs from user.title", async () => {
    const props = baseProps();
    props.tempUser.title = "Ms.";

    await runSaveAll(props);

    expect(props.onSaveProfileAttributes).toHaveBeenCalledWith(["title"]);
    expect(props.onSaveUserTitle).not.toHaveBeenCalled();
  });

  test("calls onSaveProfileAttributes with sex when tempUser.sex differs from user.sex", async () => {
    const props = baseProps();
    props.tempUser.sex = "Female";

    await runSaveAll(props);

    expect(props.onSaveProfileAttributes).toHaveBeenCalledWith(["sex"]);
    expect(props.onSaveUserSex).not.toHaveBeenCalled();
  });

  test("sends every changed profile field in one onSaveProfileAttributes call", async () => {
    const props = baseProps();
    props.tempUser.dateOfBirth = "15-06-1985";
    props.tempUser.placeOfBirth = "Germany";
    props.tempUser.nationality = "German";
    props.tempUser.title = "Ms.";
    props.tempUser.sex = "Female";

    await runSaveAll(props);

    expect(props.onSaveProfileAttributes).toHaveBeenCalledTimes(1);
    expect(props.onSaveProfileAttributes).toHaveBeenCalledWith([
      "dateOfBirth",
      "placeOfBirth",
      "nationality",
      "title",
      "sex",
    ]);
    SINGLE_PROFILE_SAVE_KEYS.forEach((key) => {
      expect(props[key]).not.toHaveBeenCalled();
    });
  });

  test("runs the profile batch, then name, then phone, then email, each after the previous one settled", async () => {
    const props = baseProps();
    props.tempUser.title = "Ms.";
    changeNamePhoneAndEmail(props);
    const batch = createDeferred();
    const name = createDeferred();
    const phone = createDeferred();
    const email = createDeferred();
    props.onSaveProfileAttributes = jest.fn(() => batch.promise);
    props.onSaveUserName = jest.fn(() => name.promise);
    props.onSaveUserPhone = jest.fn(() => phone.promise);
    props.onSaveUserEmail = jest.fn(() => email.promise);
    const { result } = renderHook(() => usePersonalDataSave(props));

    let savePromise;
    act(() => {
      savePromise = result.current.saveAll();
    });

    expect(props.onSaveProfileAttributes).toHaveBeenCalledTimes(1);
    expect(props.onSaveUserName).not.toHaveBeenCalled();
    expect(props.onSaveUserPhone).not.toHaveBeenCalled();
    expect(props.onSaveUserEmail).not.toHaveBeenCalled();

    await act(async () => {
      batch.resolve(true);
    });
    expect(props.onSaveUserName).toHaveBeenCalledTimes(1);
    expect(props.onSaveUserPhone).not.toHaveBeenCalled();

    await act(async () => {
      name.resolve(true);
    });
    expect(props.onSaveUserPhone).toHaveBeenCalledTimes(1);
    expect(props.onSaveUserEmail).not.toHaveBeenCalled();

    await act(async () => {
      phone.resolve(true);
    });
    expect(props.onSaveUserEmail).toHaveBeenCalledTimes(1);

    await act(async () => {
      email.resolve(true);
      await savePromise;
    });
    expect(result.current.saveSuccess).toBe(true);
  });

  test.each([
    ["returns false", (mock) => mock.mockResolvedValue(false)],
    ["rejects", (mock) => mock.mockRejectedValue(new Error("TooManyRequestsException"))],
  ])("reports a failure and still saves name, phone and email when the profile batch %s", async (_, setUpBatch) => {
    const props = baseProps();
    props.tempUser.title = "Ms.";
    changeNamePhoneAndEmail(props);
    setUpBatch(props.onSaveProfileAttributes);

    const result = await runSaveAll(props);

    expect(props.onSaveUserName).toHaveBeenCalledTimes(1);
    expect(props.onSaveUserPhone).toHaveBeenCalledTimes(1);
    expect(props.onSaveUserEmail).toHaveBeenCalledTimes(1);
    expect(result.current.saveError).toBe(true);
    expect(result.current.saveSuccess).toBe(false);
  });

  test("reports success when every changed field saves successfully", async () => {
    const props = baseProps();
    props.tempUser.title = "Ms.";

    const result = await runSaveAll(props);

    expect(result.current.saveSuccess).toBe(true);
    expect(result.current.saveError).toBe(false);
  });

  test("reports a failure instead of a false success when a changed field resolves false", async () => {
    const props = baseProps();
    props.tempUser.title = "Ms.";
    props.onSaveProfileAttributes = jest.fn().mockResolvedValue(false);

    const result = await runSaveAll(props);

    expect(result.current.saveError).toBe(true);
    expect(result.current.saveSuccess).toBe(false);
  });

  test("reports a failure instead of a false success when a changed field rejects", async () => {
    const props = baseProps();
    props.tempUser.sex = "Female";
    props.onSaveProfileAttributes = jest.fn().mockRejectedValue(new Error("network down"));

    const result = await runSaveAll(props);

    expect(result.current.saveError).toBe(true);
    expect(result.current.saveSuccess).toBe(false);
  });

  test("does not report success when the email save only started verification, not a completed save", async () => {
    const props = baseProps();
    props.tempUser.email = "new@example.com";
    props.onSaveUserEmail = jest.fn().mockResolvedValue("pending");

    const result = await runSaveAll(props);

    expect(result.current.saveSuccess).toBe(false);
    expect(result.current.saveError).toBe(false);
  });

  test("still reports success when one field fails but is unchanged (not part of this save)", async () => {
    const props = baseProps();
    props.tempUser.title = "Ms.";
    props.onSaveUserPhone = jest.fn().mockResolvedValue(false);

    const result = await runSaveAll(props);

    expect(props.onSaveUserPhone).not.toHaveBeenCalled();
    expect(result.current.saveSuccess).toBe(true);
    expect(result.current.saveError).toBe(false);
  });
});
