import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { AppleAuthProvider, GoogleAuthProvider, firebaseAuth, type FirebaseUser } from '../services/firebase';

type Status = 'loading' | 'signed-in' | 'signed-out';

interface AuthContextValue {
  user: FirebaseUser | null;
  status: Status;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
}

const AuthCtx = createContext<AuthContextValue | null>(null);

interface RuntimeExtra {
  googleWebClientId?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as RuntimeExtra;
const googleWebClientId = extra.googleWebClientId ?? '';

// Configure Google Sign-In once at module load. Without a webClientId Google
// Sign-In will throw a helpful error on first use, which surfaces back to the
// onboarding UI.
GoogleSignin.configure({
  webClientId: googleWebClientId,
  offlineAccess: false
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    return firebaseAuth.onAuthStateChanged(async (u) => {
      setUser(u);
      setStatus(u ? 'signed-in' : 'signed-out');
      if (u) {
        // Register the device for stamp-earn pushes. Lazy import keeps the
        // FCM native module from loading on cold-start when the user isn't
        // signed in. Best-effort — failures never block sign-in.
        try {
          const idToken = await u.getIdToken();
          const { registerDeviceForPush } = await import('../services/push');
          await registerDeviceForPush(idToken);
        } catch {
          // ignore
        }
      }
    });
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await firebaseAuth.signInWithEmailAndPassword(email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    await firebaseAuth.createUserWithEmailAndPassword(email, password);
  }, []);

  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is iOS-only in v0.1');
    }
    // Apple wants a SHA-256 hex digest of the nonce; Firebase wants the raw
    // nonce paired with the identityToken.
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL
      ],
      nonce: hashedNonce
    });
    if (!credential.identityToken) {
      throw new Error('Apple did not return an identity token');
    }
    const appleCredential = AppleAuthProvider.credential(credential.identityToken, rawNonce);
    await firebaseAuth.signInWithCredential(appleCredential);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!googleWebClientId) {
      throw new Error('Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to enable Google sign-in');
    }
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      const idToken = result.data?.idToken;
      if (!idToken) {
        throw new Error('Google did not return an idToken');
      }
      const googleCredential = GoogleAuthProvider.credential(idToken);
      await firebaseAuth.signInWithCredential(googleCredential);
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err) {
        const code = (err as { code?: string }).code;
        if (code === statusCodes.SIGN_IN_CANCELLED || code === statusCodes.IN_PROGRESS) {
          return;
        }
      }
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const previous = await GoogleSignin.hasPreviousSignIn();
      if (previous) await GoogleSignin.signOut();
    } catch {
      // best-effort; ignore
    }
    await firebaseAuth.signOut();
  }, []);

  const getIdToken = useCallback(async (forceRefresh = false) => {
    const current = firebaseAuth.currentUser;
    if (!current) return null;
    return current.getIdToken(forceRefresh);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      signInWithEmail,
      signUpWithEmail,
      signInWithApple,
      signInWithGoogle,
      signOut,
      getIdToken
    }),
    [user, status, signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogle, signOut, getIdToken]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthContextValue {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
