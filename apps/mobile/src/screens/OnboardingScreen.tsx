import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { Button } from '../design/atoms';
import { Icon } from '../design/Icon';
import { SunMark } from '../design/SunMark';
import { useAppState } from '../state/AppState';
import { useAuth } from '../state/AuthContext';
import { STRAVA_CLIENT_ID, exchangeStravaCode, useStravaAuth } from '../services/strava';

type Step = 'splash' | 'signin' | 'primer' | 'sync';
type SyncPhase = 'idle' | 'connecting' | 'syncing' | 'done';

export function OnboardingScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { setHasOnboarded } = useAppState();
  const [step, setStep] = useState<Step>('splash');

  return (
    <View style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top + 24 }}>
      {step === 'splash'  && <Splash next={() => setStep('signin')} />}
      {step === 'signin'  && <SignIn back={() => setStep('splash')} next={() => setStep('primer')} />}
      {step === 'primer'  && <Primer back={() => setStep('signin')} next={() => setStep('sync')} />}
      {step === 'sync'    && <ConnectStrava back={() => setStep('primer')} done={() => setHasOnboarded(true)} />}
    </View>
  );
}

function Splash({ next }: { next: () => void }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, paddingHorizontal: 32, paddingTop: 40, paddingBottom: 36, justifyContent: 'space-between' }}>
      <View>
        <SunMark size={96} />
        <Eyebrow style={{ marginTop: 48, marginBottom: 14 }}>RUNSTAMP · v0.1</Eyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <TText variant="serif" style={{ fontSize: 50, lineHeight: 54, letterSpacing: -1.2, color: c.ink }}>
            Make your runs{'\n'}
          </TText>
          <TText variant="serifItalic" style={{ fontSize: 50, lineHeight: 54, letterSpacing: -1.2, color: c.accent }}>
            look as good
          </TText>
          <TText variant="serif" style={{ fontSize: 50, lineHeight: 54, letterSpacing: -1.2, color: c.ink }}>
            {'\n'}as they felt.
          </TText>
        </View>
      </View>

      <View>
        <View style={{
          paddingHorizontal: 16, paddingVertical: 14,
          borderRadius: 12, borderWidth: 1, borderColor: c.line,
          flexDirection: 'row', gap: 12, alignItems: 'center',
          backgroundColor: c.paper2, marginBottom: 18
        }}>
          <Icon.github size={22} color={c.ink2} />
          <View style={{ flex: 1 }}>
            <TText style={{ fontSize: 13, fontWeight: '500', color: c.ink }}>Open source.</TText>
            <TText style={{ fontSize: 12, color: c.ink3 }}>AGPL-3.0 · your data, your server, your call.</TText>
          </View>
        </View>
        <Button kind="primary" full onPress={next} iconRight={<Icon.chevR size={18} color={c.paper} />}>Get started</Button>
        <TText style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: c.ink3 }}>
          Already have an account?{' '}
          <TText style={{ color: c.ink, textDecorationLine: 'underline' }}>Sign in</TText>
        </TText>
      </View>
    </View>
  );
}

function SignIn({ back, next }: { back: () => void; next: () => void }) {
  const c = useColors();
  const { signInWithApple, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  function clearError() {
    setError(null);
  }

  async function handleApple() {
    clearError();
    setBusy(true);
    try {
      await signInWithApple();
      next();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('ERR_REQUEST_CANCELED')) {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    clearError();
    setBusy(true);
    try {
      await signInWithGoogle();
      next();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('cancelled')) {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleEmail() {
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    clearError();
    setBusy(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }
      next();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <Pressable onPress={back} style={{ marginBottom: 24 }}><Icon.back size={22} color={c.ink2} /></Pressable>
      <Eyebrow style={{ marginBottom: 10 }}>STEP 01 · 03</Eyebrow>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <TText variant="serif" style={{ fontSize: 36, lineHeight: 40, letterSpacing: -0.8 }}>Sign in to </TText>
        <TText variant="serifItalic" style={{ fontSize: 36, lineHeight: 40, letterSpacing: -0.8, color: c.accent }}>Runstamp</TText>
        <TText variant="serif" style={{ fontSize: 36, lineHeight: 40, letterSpacing: -0.8 }}>.</TText>
      </View>
      <TText style={{ fontSize: 15, lineHeight: 22, color: c.ink3, marginTop: 8, marginBottom: 32 }}>
        We use Firebase Auth. We never see your password. You can self-host the whole thing.
      </TText>

      <View style={{ gap: 10, opacity: busy ? 0.6 : 1 }}>
        {/* Apple Sign-In is iOS-only. Android support via the web flow is
            deferred to v1 — it requires a web redirect that complicates the
            setup considerably without adding much for the typical user. */}
        {Platform.OS === 'ios' && (
          <Button
            kind="primary"
            full
            onPress={handleApple}
            disabled={busy}
            icon={<Icon.apple size={18} color={c.paper} />}
          >
            Continue with Apple
          </Button>
        )}
        <Button
          kind="ghost"
          full
          onPress={handleGoogle}
          disabled={busy}
          icon={
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#4285f4', borderWidth: 1, borderColor: c.line }} />
          }
        >
          Continue with Google
        </Button>
        <Button
          kind="ghost"
          full
          onPress={() => { clearError(); setEmailOpen((o) => !o); }}
          disabled={busy}
        >
          Continue with email
        </Button>
      </View>

      {emailOpen && (
        <View style={{ marginTop: 20, gap: 10 }}>
          <TextInput
            value={email}
            onChangeText={(t) => { setEmail(t); clearError(); }}
            placeholder="you@example.com"
            placeholderTextColor={c.ink3}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!busy}
            style={{
              height: 48, paddingHorizontal: 16, borderRadius: 10,
              borderWidth: 1, borderColor: c.line,
              backgroundColor: c.paper2, color: c.ink, fontSize: 15
            }}
          />
          <TextInput
            value={password}
            onChangeText={(t) => { setPassword(t); clearError(); }}
            placeholder="Password"
            placeholderTextColor={c.ink3}
            secureTextEntry
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            editable={!busy}
            style={{
              height: 48, paddingHorizontal: 16, borderRadius: 10,
              borderWidth: 1, borderColor: c.line,
              backgroundColor: c.paper2, color: c.ink, fontSize: 15
            }}
          />
          <Button
            kind="primary"
            full
            onPress={handleEmail}
            disabled={busy}
          >
            {isSignUp ? 'Create account' : 'Sign in'}
          </Button>
          <Pressable onPress={() => { setIsSignUp((v) => !v); clearError(); }} style={{ alignSelf: 'center', marginTop: 4 }}>
            <TText style={{ fontSize: 13, color: c.ink3 }}>
              {isSignUp ? 'Already have an account? ' : 'Need an account? '}
              <TText style={{ color: c.ink, textDecorationLine: 'underline' }}>
                {isSignUp ? 'Sign in' : 'Sign up'}
              </TText>
            </TText>
          </Pressable>
        </View>
      )}

      {busy && (
        <TText
          variant="mono"
          style={{ marginTop: 14, textAlign: 'center', fontSize: 11, color: c.ink3 }}
        >
          AUTHENTICATING…
        </TText>
      )}

      {error && (
        <Eyebrow style={{ marginTop: 14, color: '#c44a1e', fontSize: 11, lineHeight: 16 }}>
          {error}
        </Eyebrow>
      )}

      <TText style={{ marginTop: 48, fontSize: 11, color: c.ink3, lineHeight: 18 }}>
        By continuing you agree to the <TText style={{ color: c.ink2, textDecorationLine: 'underline' }}>terms</TText> and{' '}
        <TText style={{ color: c.ink2, textDecorationLine: 'underline' }}>privacy policy</TText>.
        We are reader-only with your fitness data.
      </TText>
    </ScrollView>
  );
}

function Primer({ back, next }: { back: () => void; next: () => void }) {
  const c = useColors();
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 32, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <Pressable onPress={back} style={{ marginBottom: 24 }}><Icon.back size={22} color={c.ink2} /></Pressable>
      <Eyebrow style={{ marginBottom: 10 }}>STEP 02 · 03</Eyebrow>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <TText variant="serif" style={{ fontSize: 32, lineHeight: 36, letterSpacing: -0.6 }}>Connect your </TText>
        <TText variant="serifItalic" style={{ fontSize: 32, lineHeight: 36, letterSpacing: -0.6 }}>runs</TText>
        <TText variant="serif" style={{ fontSize: 32, lineHeight: 36, letterSpacing: -0.6 }}>.</TText>
      </View>
      <TText style={{ fontSize: 15, lineHeight: 22, color: c.ink3, marginTop: 8, marginBottom: 24 }}>
        Runstamp doesn’t track runs. It reads runs you’ve already recorded elsewhere — beautifully.
      </TText>

      <View style={{ gap: 12 }}>
        <ConnectRow
          color="#fc4c02"
          iconNode={<Icon.strava size={26} color="#fff" />}
          title="Strava"
          desc="Activities, segments, splits. Webhook-driven — runs land within seconds."
          required
        />
        <ConnectRow
          color="#fb466c"
          iconNode={<Icon.heart size={22} color="#fff" />}
          title="Apple Health"
          desc="Workouts, heart rate, route. Reader-only — we never write back."
        />
        <ConnectRow
          color={c.paper2}
          iconNode={<Icon.cam size={20} color={c.ink2} />}
          title="Photos"
          desc="Optional. So your shares can use real photos from the route."
          subtle
        />
      </View>

      <View style={{ flex: 1, minHeight: 24 }} />
      <Button kind="primary" full onPress={next} iconRight={<Icon.chevR size={18} color={c.paper} />}>Continue</Button>
    </ScrollView>
  );
}

function ConnectRow({ color, iconNode, title, desc, required, subtle }: { color: string; iconNode: React.ReactNode; title: string; desc: string; required?: boolean; subtle?: boolean }) {
  const c = useColors();
  return (
    <View style={{ padding: 14, borderRadius: 14, borderWidth: 1, borderColor: c.line, flexDirection: 'row', gap: 14 }}>
      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: color, alignItems: 'center', justifyContent: 'center', borderWidth: subtle ? 1 : 0, borderColor: c.line }}>
        {iconNode}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <TText style={{ fontWeight: '500', fontSize: 15, color: c.ink }}>{title}</TText>
          {required && <Eyebrow style={{ color: c.accent, fontSize: 9 }}>REQUIRED</Eyebrow>}
        </View>
        <TText style={{ fontSize: 12.5, color: c.ink3, lineHeight: 18, marginTop: 2 }}>{desc}</TText>
      </View>
    </View>
  );
}

function ConnectStrava({ back, done }: { back: () => void; done: () => void }) {
  const c = useColors();
  const { request, response, promptAsync, redirectUri } = useStravaAuth();
  const { getIdToken } = useAuth();
  const [phase, setPhase] = useState<SyncPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Real flow runs only when the user has provisioned a Strava client id
  // via EXPO_PUBLIC_STRAVA_CLIENT_ID. Without it we keep the demo simulation
  // so the onboarding screen still walks end-to-end on a fresh checkout.
  const stravaReady = STRAVA_CLIENT_ID.length > 0;

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      setPhase('syncing');
      if (!stravaReady) return; // simulator path
      const code = response.params.code;
      const verifier = request?.codeVerifier;
      if (!code || !verifier) {
        setError('Missing auth code or PKCE verifier');
        setPhase('idle');
        return;
      }
      (async () => {
        try {
          const idToken = await getIdToken();
          await exchangeStravaCode({ code, codeVerifier: verifier, redirectUri }, idToken);
          setProgress(100);
          setPhase('done');
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Strava exchange failed');
          setPhase('idle');
        }
      })();
    } else if (
      response.type === 'error' ||
      response.type === 'dismiss' ||
      response.type === 'cancel'
    ) {
      setPhase('idle');
    }
  }, [response, stravaReady, request, redirectUri, getIdToken]);

  useEffect(() => {
    if (phase === 'connecting') {
      const t = setTimeout(() => setPhase('syncing'), 900);
      return () => clearTimeout(t);
    }
    // Only run the demo progress loop in simulator mode. The real path
    // updates progress to 100 directly when the backend responds.
    if (phase === 'syncing' && !stravaReady) {
      const id = setInterval(() => {
        setProgress((p) => {
          const np = p + Math.random() * 8 + 4;
          if (np >= 100) {
            clearInterval(id);
            setPhase('done');
            return 100;
          }
          return np;
        });
      }, 140);
      return () => clearInterval(id);
    }
    return undefined;
  }, [phase, stravaReady]);

  if (phase === 'idle') {
    return (
      <ScrollView contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 32, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={back} style={{ marginBottom: 24 }}><Icon.back size={22} color={c.ink2} /></Pressable>
        <Eyebrow style={{ marginBottom: 10 }}>STEP 03 · 03</Eyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <TText variant="serif" style={{ fontSize: 32, lineHeight: 36, letterSpacing: -0.6 }}>Connect </TText>
          <TText variant="serifItalic" style={{ fontSize: 32, lineHeight: 36, letterSpacing: -0.6, color: '#fc4c02' }}>Strava</TText>
          <TText variant="serif" style={{ fontSize: 32, lineHeight: 36, letterSpacing: -0.6 }}>.</TText>
        </View>
        <TText style={{ fontSize: 15, lineHeight: 22, color: c.ink3, marginTop: 8, marginBottom: 24 }}>
          You’ll be asked to authorize Runstamp in your browser. We request read-only access to your activities.
        </TText>

        <View style={{ backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 16, marginBottom: 24 }}>
          <Eyebrow style={{ marginBottom: 10 }}>WHAT WE READ</Eyebrow>
          {[
            ['activity:read',      'Activity list, distance, time, splits'],
            ['activity:read_all',  'Includes routes flagged as private'],
            ['profile:read_all',   'Username, profile photo']
          ].map(([s, d], i) => (
            <View key={s} style={{ flexDirection: 'row', gap: 10, paddingVertical: 6, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.line2 }}>
              <Icon.check size={14} color={c.moss} />
              <View style={{ flex: 1 }}>
                <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>{s}</TText>
                <TText style={{ fontSize: 12, color: c.ink3, lineHeight: 16 }}>{d}</TText>
              </View>
            </View>
          ))}
        </View>

        <View style={{ flex: 1, minHeight: 16 }} />
        <Button kind="accent" full onPress={() => { setPhase('connecting'); promptAsync(); }} icon={<Icon.strava size={20} color="#fff" />} style={{ backgroundColor: '#fc4c02', borderColor: '#fc4c02' }}>
          Authorize Strava
        </Button>
        {error && (
          <Eyebrow style={{ color: '#c44a1e', marginTop: 12, textAlign: 'center' }}>{error}</Eyebrow>
        )}
        {!stravaReady && (
          <Eyebrow style={{ color: c.ink3, marginTop: 12, textAlign: 'center' }}>
            DEMO MODE — SET EXPO_PUBLIC_STRAVA_CLIENT_ID FOR A REAL EXCHANGE
          </Eyebrow>
        )}
        <Pressable onPress={done} style={{ marginTop: 14, alignSelf: 'center' }}>
          <TText style={{ fontSize: 13, color: c.ink3 }}>Skip — set up later</TText>
        </Pressable>
      </ScrollView>
    );
  }

  const pct = phase === 'done' ? 100 : progress;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);

  return (
    <View style={{ flex: 1, paddingHorizontal: 32, alignItems: 'center', paddingTop: 24 }}>
      <View style={{ marginTop: 48, width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={120} height={120} style={{ position: 'absolute' }}>
          <Circle cx={60} cy={60} r={radius} fill="none" stroke={c.line} strokeWidth={2} />
          <Circle
            cx={60}
            cy={60}
            r={radius}
            fill="none"
            stroke={c.accent}
            strokeWidth={3}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
        </Svg>
        {phase === 'done' ? <Icon.check size={40} color={c.accent} /> : <SunMark size={48} />}
      </View>

      <TText variant="serif" style={{ fontSize: 28, lineHeight: 30, letterSpacing: -0.4, color: c.ink, marginTop: 32, textAlign: 'center' }}>
        {phase === 'connecting' && 'Authorizing…'}
        {phase === 'syncing'    && 'Backfilling your runs'}
        {phase === 'done'       && 'You’re in.'}
      </TText>
      <TText style={{ color: c.ink3, fontSize: 14, textAlign: 'center', maxWidth: 280, lineHeight: 20, marginTop: 6 }}>
        {phase === 'connecting' && 'Returning from Strava.'}
        {phase === 'syncing'    && `Last 90 days first, then 5 years in the background. ${Math.round(progress)}%`}
        {phase === 'done'       && 'Pulled 612 runs across 4,287 km. Welcome, Gilla.'}
      </TText>

      {phase === 'done' && (
        <View style={{ marginTop: 'auto', width: '100%', paddingBottom: 32 }}>
          <Button kind="primary" full onPress={done} iconRight={<Icon.chevR size={18} color={c.paper} />}>Open Runstamp</Button>
        </View>
      )}
    </View>
  );
}
