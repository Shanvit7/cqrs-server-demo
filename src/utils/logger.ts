import { isProduction } from '@/utils/constants';

const logger = {
  log: (message?: unknown, ...optionalParams: unknown[]) => {
    if (!isProduction) {
      console.log(message, ...optionalParams);
    }
  },
  error: (message?: unknown, ...optionalParams: unknown[]) => {
    console.error(message, ...optionalParams);
  },
  warn: (message?: unknown, ...optionalParams: unknown[]) => {
    if (!isProduction) {
      console.warn(message, ...optionalParams);
    }
  },
  info: (message?: unknown, ...optionalParams: unknown[]) => {
    if (!isProduction) {
      console.info(message, ...optionalParams);
    }
  },
};

export default logger;
