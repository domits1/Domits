import { createContext, useContext } from "react";
import { PropertyBuilder } from "../features/hostonboarding/stores/propertyBuilder";

const BuilderContext = createContext(new PropertyBuilder());

export const useBuilder = () => useContext(BuilderContext);

export const BuilderProvider = ({ children }) => {
  const builder = new PropertyBuilder();
  return (
    <BuilderContext.Provider value={builder}>
      {children}
    </BuilderContext.Provider>
  );
};
