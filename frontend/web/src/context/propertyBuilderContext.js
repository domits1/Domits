
import { createContext, useContext, useState, useEffect } from "react";
import { PropertyBuilder } from "../features/hostonboarding/stores/propertyBuilder";

const BuilderContext = createContext(null);

export const useBuilder = () => {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error("useBuilder must be used within BuilderProvider");
  }
  return context;
};

export const BuilderProvider = ({ children }) => {
  // Initialize builder from sessionStorage or create new
  const [builder] = useState(() => {
    const saved = sessionStorage.getItem('propertyBuilder');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const restoredBuilder = new PropertyBuilder();
        // Restore all properties
        Object.assign(restoredBuilder, data);
        return restoredBuilder;
      } catch (e) {
        console.error('Failed to restore builder:', e);
      }
    }
    return new PropertyBuilder();
  });

  // Save builder to sessionStorage whenever it changes
  useEffect(() => {
    const saveBuilder = () => {
      try {
        sessionStorage.setItem('propertyBuilder', JSON.stringify(builder));
      } catch (e) {
        console.error('Failed to save builder:', e);
      }
    };

    // Save periodically (every 500ms after changes)
    const timer = setTimeout(saveBuilder, 500);
    return () => clearTimeout(timer);
  }, [builder]);

  // Wrap builder methods to force re-render and save
  const wrappedBuilder = new Proxy(builder, {
    get(target, prop) {
      const value = target[prop];
      
      // If it's a builder method (returns this), wrap it
      if (typeof value === 'function' && prop.startsWith('add')) {
        return function(...args) {
          const result = value.apply(target, args);
          // Force save after mutation
          sessionStorage.setItem('propertyBuilder', JSON.stringify(target));
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