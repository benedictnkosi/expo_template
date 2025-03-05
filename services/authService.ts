import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/config/firebase';

// Configure Google Sign-in
GoogleSignin.configure({
    webClientId: '962175862762-a69fp6lmlbdaqvl45ii2jaqk77d9164u.apps.googleusercontent.com', // Get this from Firebase
    offlineAccess: true // Add this
});


export async function googleLogin() {
    try {
        await GoogleSignin.hasPlayServices();
        const userInfo = (await GoogleSignin.signIn()) as unknown as { idToken: string | null };

        if (!userInfo.idToken) {
            throw new Error('No ID token present');
        }

        const credential = GoogleAuthProvider.credential(userInfo.idToken);
        const result = await signInWithCredential(auth, credential);
        return result;
    } catch (error: any) {
        console.error('Google Sign In Error:', error);
        if (error.code === 'auth/network-request-failed') {
            throw new Error('Network error. Please check your connection.');
        }
        throw error;
    }
}
