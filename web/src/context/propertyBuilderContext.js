import React, { createContext, useContext, useRef } from "react"; // Added useRef
import { PropertyBuilder } from "../features/hostonboarding/stores/propertyBuilder";

const BuilderContext = createContext(null);

export const useBuilder = () => {
  const context = useContext(BuilderContext);
  if (context === null) {
    throw new Error("useBuilder must be used within a BuilderProvider");
  }
  return context;
};

export const BuilderProvider = ({ children }) => {

  const builderRef = useRef(null);
  if (builderRef.current === null) {
    builderRef.current = new PropertyBuilder();
    console.log("BuilderProvider: Created NEW PropertyBuilder instance");
  }

  return (
    <BuilderContext.Provider value={builderRef.current}>
      {children}
    </BuilderContext.Provider>
  );
};