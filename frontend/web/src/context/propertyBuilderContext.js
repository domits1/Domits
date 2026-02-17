import { createContext, useContext, useState, useEffect } from "react";
import { PropertyBuilder } from "../features/hostonboarding/stores/propertyBuilder";
const BuilderContext = createContext(null);
const STORAGE_KEY = "propertyBuilder";

const sanitizeBuilderForStorage = (builder) => {
  if (!builder || typeof builder !== "object") return builder;
  const snapshot = { ...builder };
  if (snapshot.propertyImages) {
    snapshot.propertyImages = [];
  }
  return snapshot;
};

const persistBuilder = (builder) => {
  try {
    const snapshot = sanitizeBuilderForStorage(builder);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.error("Failed to save builder:", e);
  }
};
export const useBuilder = () => {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error("useBuilder must be used within BuilderProvider");
  }
  return context;
};

export const BuilderProvider = ({ children }) => {
  const [builder] = useState(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const restoredBuilder = new PropertyBuilder();
        Object.assign(restoredBuilder, data);
        return restoredBuilder;
      } catch (e) {
        console.error('Failed to restore builder:', e);
      }
    }
    return new PropertyBuilder();
  });
  useEffect(() => {
    const timer = setTimeout(() => persistBuilder(builder), 500);
    return () => clearTimeout(timer);
  }, [builder]);
  const wrappedBuilder = new Proxy(builder, {
    get(target, prop) {
      const value = target[prop];
      if (typeof value === 'function' && prop.startsWith('add')) {
        return function(...args) {
          const result = value.apply(target, args);
          persistBuilder(target);
          return result;
        };
      }
      
      return value;
    }
  });

  return (
    <BuilderContext.Provider value={wrappedBuilder}>
      {children}
    </BuilderContext.Provider>
  );
};