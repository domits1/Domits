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
});

describe("usePersonalDataSave", () => {
  test("does not call onSaveUserTitle or onSaveUserSex when unchanged", async () => {
    const props = baseProps();
    const { result } = renderHook(() => usePersonalDataSave(props));

    await act(async () => {
      await result.current.saveAll();
    });

    expect(props.onSaveUserTitle).not.toHaveBeenCalled();
    expect(props.onSaveUserSex).not.toHaveBeenCalled();
  });

  test("calls onSaveUserTitle when tempUser.title differs from user.title", async () => {
    const props = baseProps();
    props.tempUser.title = "Ms.";
    const { result } = renderHook(() => usePersonalDataSave(props));

    await act(async () => {
      await result.current.saveAll();
    });

    expect(props.onSaveUserTitle).toHaveBeenCalled();
  });

  test("calls onSaveUserSex when tempUser.sex differs from user.sex", async () => {
    const props = baseProps();
    props.tempUser.sex = "Female";
    const { result } = renderHook(() => usePersonalDataSave(props));

    await act(async () => {
      await result.current.saveAll();
    });

    expect(props.onSaveUserSex).toHaveBeenCalled();
  });

  test("reports success when every changed field saves successfully", async () => {
    const props = baseProps();
    props.tempUser.title = "Ms.";
    const { result } = renderHook(() => usePersonalDataSave(props));

    await act(async () => {
      await result.current.saveAll();
    });

    expect(result.current.saveSuccess).toBe(true);
    expect(result.current.saveError).toBe(false);
  });

  test("reports a failure instead of a false success when a changed field resolves false", async () => {
    const props = baseProps();
    props.tempUser.title = "Ms.";
    props.onSaveUserTitle = jest.fn().mockResolvedValue(false);
    const { result } = renderHook(() => usePersonalDataSave(props));

    await act(async () => {
      await result.current.saveAll();
    });

    expect(result.current.saveError).toBe(true);
    expect(result.current.saveSuccess).toBe(false);
  });

  test("reports a failure instead of a false success when a changed field rejects", async () => {
    const props = baseProps();
    props.tempUser.sex = "Female";
    props.onSaveUserSex = jest.fn().mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => usePersonalDataSave(props));

    await act(async () => {
      await result.current.saveAll();
    });

    expect(result.current.saveError).toBe(true);
    expect(result.current.saveSuccess).toBe(false);
  });

  test("still reports success when one field fails but is unchanged (not part of this save)", async () => {
    const props = baseProps();
    props.tempUser.title = "Ms.";
    props.onSaveUserSex = jest.fn().mockResolvedValue(false);
    const { result } = renderHook(() => usePersonalDataSave(props));

    await act(async () => {
      await result.current.saveAll();
    });

    expect(props.onSaveUserSex).not.toHaveBeenCalled();
    expect(result.current.saveSuccess).toBe(true);
    expect(result.current.saveError).toBe(false);
  });
});
