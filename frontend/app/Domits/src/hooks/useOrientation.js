import { useState, useEffect } from "react";
import { Dimensions } from "react-native";

/**
 * Custom hook to determine device orientation and track screen dimensions.
 *
 * @returns {Object} An object containing:
 *   - `dimensions` {Object}: Contains `window` and `screen` sizes.
 *   - `isLandscape` {Boolean}: Indicates whether the device is in landscape mode.
 */
const useOrientation = () => {
  const windowDimensions = Dimensions.get("window");
  const screenDimensions = Dimensions.get("screen");

  const [isLandscape, setIsLandscape] = useState(
      windowDimensions.width > windowDimensions.height
  );
  const [dimensions, setDimensions] = useState({
    window: windowDimensions,
    screen: screenDimensions,
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window, screen }) => {
      setDimensions({ window, screen });
      setIsLandscape(window.width > window.height);
    });

    return () => subscription?.remove();
  }, []);

  return { dimensions, isLandscape };
};

export default useOrientation;
