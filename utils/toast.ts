import { Platform } from 'react-native';

let Snackbar: any;
if (Platform.OS !== 'web') {
  Snackbar = require('react-native-snackbar').default;
}

export const showToast = (message: string) => {
  if (Platform.OS === 'web') {
    alert(message);
  } else {
    Snackbar?.show({
      text: message,
      duration: 3000,
      backgroundColor: '#4CAF50',
    });
  }
}; 