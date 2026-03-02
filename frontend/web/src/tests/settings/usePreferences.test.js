import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LanguageContext } from "../../context/LanguageContext";
import usePreferences from "../../hooks/usePreferences";

const mockSetLanguage = jest.fn();

const createWrapper = (language = "en") => {
  const Wrapper = ({ children }) => {
    const contextValue = useMemo(
      () => ({ language, setLanguage: mockSetLanguage }),
      [language]
    );

    return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
  };

  Wrapper.propTypes = {
    children: PropTypes.node,
  };

  return Wrapper;
};

describe.skip("usePreferences", () => {
  beforeEach(() => {
    localStorage.clear();
    mockSetLanguage.mockClear();
  });

  test("returns language from context", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper: createWrapper("nl") });
    expect(result.current.language).toBe("nl");
  });

  test("returns default dateFormat en when localStorage is empty", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper: createWrapper() });
    expect(result.current.dateFormat).toBe("en");
  });

  test("returns default priceFormat usd when localStorage is empty", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper: createWrapper() });
    expect(result.current.priceFormat).toBe("usd");
  });

  test("reads dateFormat from localStorage on initialisation", () => {
    localStorage.setItem("dateFormat", "nl");
    const { result } = renderHook(() => usePreferences(), { wrapper: createWrapper() });
    expect(result.current.dateFormat).toBe("nl");
  });

  test("reads priceFormat from localStorage on initialisation", () => {
    localStorage.setItem("priceFormat", "eur");
    const { result } = renderHook(() => usePreferences(), { wrapper: createWrapper() });
    expect(result.current.priceFormat).toBe("eur");
  });

  test("onLanguageChange delegates to context setLanguage", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper: createWrapper() });
    act(() => {
      result.current.onLanguageChange({ target: { value: "de" } });
    });
    expect(mockSetLanguage).toHaveBeenCalledWith("de");
  });

  test("onDateFormatChange updates dateFormat state", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper: createWrapper() });
    act(() => {
      result.current.onDateFormatChange({ target: { value: "nl" } });
    });
    expect(result.current.dateFormat).toBe("nl");
  });

  test("onDateFormatChange persists value to localStorage", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper: createWrapper() });
    act(() => {
      result.current.onDateFormatChange({ target: { value: "nl" } });
    });
    expect(localStorage.getItem("dateFormat")).toBe("nl");
  });

  test("onPriceFormatChange updates priceFormat state", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper: createWrapper() });
    act(() => {
      result.current.onPriceFormatChange({ target: { value: "eur" } });
    });
    expect(result.current.priceFormat).toBe("eur");
  });

  test("onPriceFormatChange persists value to localStorage", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper: createWrapper() });
    act(() => {
      result.current.onPriceFormatChange({ target: { value: "eur" } });
    });
    expect(localStorage.getItem("priceFormat")).toBe("eur");
  });

  test("returns languageOptions array containing English entry", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper: createWrapper() });
    expect(result.current.languageOptions).toEqual(
      expect.arrayContaining([expect.objectContaining({ value: "en", label: expect.any(String) })])
    );
  });

  test("returns dateFormatOptions array containing at least one entry", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper: createWrapper() });
    expect(result.current.dateFormatOptions.length).toBeGreaterThan(0);
  });

  test("returns priceFormatOptions array containing usd entry", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper: createWrapper() });
    expect(result.current.priceFormatOptions).toEqual(
      expect.arrayContaining([expect.objectContaining({ value: "usd" })])
    );
  });
});
