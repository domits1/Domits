const refuse = (name) => () => {
  throw new Error(`The static page generator called React.${name}; it must not render components.`);
};

export const createElement = () => null;
export const Fragment = "Fragment";
export const cloneElement = refuse("cloneElement");
export const isValidElement = refuse("isValidElement");
export const useCallback = refuse("useCallback");
export const useEffect = refuse("useEffect");
export const useLayoutEffect = refuse("useLayoutEffect");
export const useMemo = refuse("useMemo");
export const useRef = refuse("useRef");
export const useState = refuse("useState");
export default { createElement, Fragment };
