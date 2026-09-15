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
});
