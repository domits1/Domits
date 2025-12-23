import { createContext, useContext, useEffect, useState } from "react";

const RefreshContext = createContext(0);

export const RefreshProvider = ({ children }) => {
  const [signal, setSignal] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSignal((prevSignal) => prevSignal + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setSignal((prevSignal) => prevSignal + 1);
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return <RefreshContext.Provider value={signal}>{children}</RefreshContext.Provider>;
};

export const useRefreshSignal = () => useContext(RefreshContext);