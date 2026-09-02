/// <reference types="expo/types" />

declare const process: {
  env: {
    NODE_ENV?: string;
    EXPO_PUBLIC_API_URL?: string;
    [key: string]: string | undefined;
  };
};
