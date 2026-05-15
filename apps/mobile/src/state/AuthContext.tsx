/**
 * Firebase Auth context for Runstamp.
 *
 * Provides:
 *   - `user`            Firebase User (or null)
 *   - `status`          'loading' | 'signed-in' | 'signed-out'
 *   - `signInWithEmail` / `signUpWithEmail`
 *   - `signInWithApple` (iOS only — throws on other platforms)
 *   - `signInWithGoogle` (requires EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID)
 *   - `signOut`
 *   - `getIdToken`      wraps user.getIdToken(); returns null when signed out
 *
 * Apple Sign-In note: Android support via web flow is complex and intentionally
 * deferred to v1. The Apple button in OnboardingScreen is hidden on non-iOS
 * platforms so users are never presented a broken path.
 *
 * Google Sign-In uses expo-auth-session's `useIdTokenAuthRequest` hook with
 * the `expo-crypto` nonce. The hook lives in AuthProvider so it can be
 * initialised once at mount and shared to any child that calls `useAuth()`.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { Platform } from 'react-native';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  signOut as firebaseSignOut,
  OAuthProvider,
  GoogleAuthProvider,
  type User
} from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { firebaseAuth } from '../services/firebase';

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out';

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
}

const AuthCtx = createContext<AuthContextValue | null>(null);

const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? 'MISSING_GOOGLE_IOS_CLIENT_ID';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const [, googleResponse, promptGoogleAsync] = useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    redirectUri: makeRedirectUri({ scheme: 'runstamp', path: 'google-callback' })
  });

  const googleResolveRef = useRef<(() => void) | null>(null);
  const googleRejectRef = useRef<((err: Error) => void) | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      setUser(firebaseUser);
      setStatus(firebaseUser ? 'signed-in' : 'signed-out');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!googleResponse) return;

    if (googleResponse.type === 'success') {
      const idToken = googleResponse.params.id_token;
      if (!idToken) {
        googleRejectRef.current?.(new Error('Google sign-in succeeded but returned no id_token'));
        googleRejectRef.current = null;
        googleResolveRef.current = null;
        return;
      }
      const credential = GoogleAuthProvider.credential(idToken);
      signInWithCredential(firebaseAuth, credential)
        .then(() => {
          googleResolveRef.current?.();
        })
        .catch((err: unknown) => {
          googleRejectRef.current?.(err instanceof Error ? err : new Error(String(err)));
        })
        .finally(() => {
          googleResolveRef.current = null;
          googleRejectRef.current = null;
        });
    } else if (
      googleResponse.type === 'error' ||
      googleResponse.type === 'dismiss' ||
      googleResponse.type === 'cancel'
    ) {
      googleRejectRef.current?.(new Error('Google sign-in was cancelled or failed'));
      googleResolveRef.current = null;
      googleRejectRef.current = null;
    }
  }, [googleResponse]);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<void> => {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string): Promise<void> => {
      await createUserWithEmailAndPassword(firebaseAuth, email, password);
    },
    []
  );

  const signInWithApple = useCallback(async (): Promise<void> => {
    if (Platform.OS !== 'ios') {
      throw new Error(
        'Apple Sign-In is only available on iOS. Android support via the web flow is deferred to v1.'
      );
    }

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
      throw new Error('Apple sign-in succeeded but returned no identity token');
    }

    const provider = new OAuthProvider('apple.com');
    const oauthCredential = provider.credential({
      idToken: credential.identityToken,
      rawNonce
    });

    await signInWithCredential(firebaseAuth, oauthCredential);
  }, []);

  const signInWithGoogle = useCallback((): Promise<void> => {
    if (GOOGLE_IOS_CLIENT_ID === 'MISSING_GOOGLE_IOS_CLIENT_ID') {
      return Promise.reject(
        new Error('Set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID to enable Google sign-in')
      );
    }

    return new Promise<void>((resolve, reject) => {
      googleResolveRef.current = resolve;
      googleRejectRef.current = reject;
      promptGoogleAsync();
    });
  }, [promptGoogleAsync]);

  const signOut = useCallback(async (): Promise<void> => {
    await firebaseSignOut(firebaseAuth);
  }, []);

  const getIdToken = useCallback(
    async (forceRefresh = false): Promise<string | null> => {
      if (!user) return null;
      return user.getIdToken(forceRefresh);
    },
    [user]
  );

  const value: AuthContextValue = {
    user,
    status,
    signInWithEmail,
    signUpWithEmail,
    signInWithApple,
    signInWithGoogle,
    signOut,
    getIdToken
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
