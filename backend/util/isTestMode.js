/**
 * Check if the application is running in TEST mode.
 * In TEST mode, AWS calls should be avoided and deterministic fixtures should be used.
 * @returns {boolean} true if TEST mode is enabled
 */
export const isTestMode = () => process.env.TEST === "true";
