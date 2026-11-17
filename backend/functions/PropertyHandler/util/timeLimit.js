export const withinTimeLimit = (promise, timeoutMs, createError) => {
  let timer;
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => reject(createError()), timeoutMs);
  });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
};
