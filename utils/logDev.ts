
export const logDev = (message: string, data?: any) => {
  if (__DEV__) {
    console.log(`[DEV LOGS] ${message}`, data ? JSON.stringify(data) : data);
  }
};