export const logger = {
    warn(...args: unknown[]) {
        if (__DEV__) {
            console.warn(...args);
        }
    },
};
