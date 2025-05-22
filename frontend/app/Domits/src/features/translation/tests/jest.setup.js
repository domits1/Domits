import {NativeModules} from 'react-native';
import {jest} from '@jest/globals';

NativeModules.EncryptedSharedPreferences = {
  setItem: jest.fn(() => Promise.resolve()),
};
