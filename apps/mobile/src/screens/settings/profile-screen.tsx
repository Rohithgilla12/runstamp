import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import { Card } from '../../design/atoms';
import { FONT } from '../../design/fonts';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';
import { useAccount } from '../../state/useAccount';
import { SubHeader, Toggle } from './bits';

// Claim a handle + flip the public toggle. PRD §10 #1 answer: we shipped
// the web profile. Handle is the URL slug at runstamp.app/u/<handle>.
// Defaults off so existing users don't get their data published without
// consent.
export function ProfileScreen({ back }: { back: () => void }) {
  const c = useColors();
  const { me, save, refresh } = useAccount();
  const [handleInput, setHandleInput] = useState(me?.handle ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const savedHandle = me?.handle ?? null;

  // Sync the input when /v1/me lands or refreshes.
  useEffect(() => {
    setHandleInput(me?.handle ?? '');
  }, [me?.handle]);

  // Auto-clear the "Saved" pulse after a couple seconds so it doesn't
  // linger and confuse a later interaction.
  useEffect(() => {
    if (!savedFlash) return;
    const t = setTimeout(() => setSavedFlash(false), 2200);
    return () => clearTimeout(t);
  }, [savedFlash]);

  const trimmed = handleInput.trim().toLowerCase();
  const isUnchanged = trimmed === (savedHandle ?? '');
  const isInvalid = trimmed.length > 0 && trimmed.length < 3;

  const claim = useCallback(async () => {
    if (isUnchanged || isInvalid) return;
    setPending(true);
    setError(null);
    setSavedFlash(false);
    try {
      await save({ handle: trimmed });
      // Refresh so /v1/me lands with the canonical server state — covers
      // the edge case where save() somehow didn't update local me.
      await refresh().catch(() => undefined);
      setSavedFlash(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }, [trimmed, isUnchanged, isInvalid, save, refresh]);

  const togglePublic = useCallback(async (next: boolean) => {
    if (!me?.handle) return;
    setError(null);
    try {
      await save({ profilePublic: next });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [me?.handle, save]);

  const publicUrl = savedHandle ? `runstamp.app/u/${savedHandle}` : null;
  const canPublish = !!savedHandle;
  const isPublic = !!me?.profilePublic && canPublish;

  const buttonDisabled = pending || isUnchanged || isInvalid || trimmed.length === 0;

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, backgroundColor: c.paper }} contentContainerStyle={{ paddingBottom: 120 }}>
      <SubHeader back={back} title="PUBLIC PROFILE" />

      {/* Current status — the first thing the user sees, so they always
          know what state their profile is in before touching anything. */}
      <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
        <Card style={{ backgroundColor: savedHandle ? c.ink : c.paper2 }}>
          <Eyebrow style={{ color: savedHandle ? c.accent : c.ink3 }}>CURRENT</Eyebrow>
          {savedHandle ? (
            <>
              <TText variant="mono" style={{ fontSize: 18, color: c.paper, marginTop: 6, letterSpacing: -0.3 }}>
                runstamp.app/u/{savedHandle}
              </TText>
              <TText style={{ fontSize: 12, color: isPublic ? '#9fcf78' : 'rgba(243,237,226,0.55)', marginTop: 6 }}>
                {isPublic ? '● Public · anyone with the URL can view' : '○ Private · only you can see this URL'}
              </TText>
            </>
          ) : (
            <TText style={{ fontSize: 14, color: c.ink2, marginTop: 6, lineHeight: 18 }}>
              No handle claimed yet. Pick one below and your album lives at <TText variant="mono" style={{ fontSize: 14, color: c.ink }}>runstamp.app/u/yourhandle</TText>.
            </TText>
          )}
        </Card>
      </View>

      <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
        <Card style={{ backgroundColor: c.paper2 }}>
          <Eyebrow style={{ color: c.ink3, marginBottom: 6 }}>
            {savedHandle ? 'CHANGE HANDLE' : 'CLAIM A HANDLE'}
          </Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TText variant="mono" style={{ fontSize: 14, color: c.ink3 }}>runstamp.app/u/</TText>
            <TextInput
              style={{
                flex: 1,
                fontFamily: FONT.mono,
                fontSize: 16,
                color: c.ink,
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: error ? (c.warn ?? '#c34a2c') : c.line,
                backgroundColor: c.paper,
                opacity: pending ? 0.6 : 1,
              }}
              placeholder="rohithgilla"
              placeholderTextColor={c.ink3}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!pending}
              value={handleInput}
              onChangeText={(t) => {
                setHandleInput(t.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                if (error) setError(null);
                if (savedFlash) setSavedFlash(false);
              }}
              maxLength={30}
              onSubmitEditing={claim}
              returnKeyType="go"
            />
          </View>
          <Pressable
            onPress={claim}
            disabled={buttonDisabled}
            style={({ pressed }) => ({
              marginTop: 12,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: savedFlash ? (c.moss ?? '#4a6b3a') : c.ink,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              opacity: pressed || buttonDisabled ? 0.55 : 1,
            })}
          >
            {pending && <ActivityIndicator size="small" color={c.paper} />}
            <TText style={{ color: c.paper, fontSize: 13, fontWeight: '500' }}>
              {pending
                ? 'Claiming…'
                : savedFlash
                  ? '✓  Saved'
                  : savedHandle
                    ? `Change to "${trimmed || '—'}"`
                    : `Claim "${trimmed || '—'}"`}
            </TText>
          </Pressable>

          {/* Below the button, three possible state lines stacked. Only
              one shows at a time. */}
          {error ? (
            <View style={{ marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: 'rgba(195,74,44,0.10)', borderWidth: 1, borderColor: 'rgba(195,74,44,0.35)' }}>
              <TText style={{ fontSize: 11, color: c.warn ?? '#c34a2c', fontWeight: '500' }}>COULDN'T CLAIM</TText>
              <TText style={{ fontSize: 12, color: c.ink2, marginTop: 2, lineHeight: 16 }}>{error}</TText>
            </View>
          ) : isInvalid ? (
            <TText style={{ fontSize: 11, color: c.ink3, marginTop: 8 }}>
              Need at least 3 characters.
            </TText>
          ) : isUnchanged && savedHandle ? (
            <TText style={{ fontSize: 11, color: c.ink3, marginTop: 8 }}>
              This is your current handle.
            </TText>
          ) : (
            <TText style={{ fontSize: 11, color: c.ink3, marginTop: 8, lineHeight: 16 }}>
              3–30 characters · lowercase letters, numbers, dashes, underscores.
            </TText>
          )}
        </Card>
      </View>

      {canPublish && (
        <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
          <Card padded={false} style={{ backgroundColor: c.paper2 }}>
            <Toggle
              label="Public"
              sub="Anyone with the URL can view your album"
              value={isPublic}
              onChange={togglePublic}
              isLast
            />
          </Card>
        </View>
      )}

      {isPublic && publicUrl && (
        <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
          <Card style={{ backgroundColor: c.ink }}>
            <Eyebrow style={{ color: c.accent }}>YOUR URL</Eyebrow>
            <TText variant="mono" style={{ fontSize: 15, color: c.paper, marginTop: 6 }}>
              {publicUrl}
            </TText>
            <Pressable
              onPress={() => {
                Share.share({ message: `https://${publicUrl}` }).catch(() => undefined);
              }}
              style={({ pressed }) => ({
                marginTop: 12,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: c.accent,
                alignItems: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <TText style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>Share my profile</TText>
            </Pressable>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}
