import React, { useCallback, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';
import { deleteAccount } from '../../services/account';
import { useAuth } from '../../state/AuthContext';

export function DeleteAccountSection() {
  const c = useColors();
  const { getIdToken, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete account?',
      'This hard-deletes your account, every imported run, every earned stamp, and your encrypted Strava tokens. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Really delete?',
              'Last chance. Tap Delete forever again to confirm.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete forever',
                  style: 'destructive',
                  onPress: async () => {
                    setBusy(true);
                    try {
                      const idToken = await getIdToken();
                      await deleteAccount(idToken);
                      await signOut();
                    } catch (e) {
                      Alert.alert('Couldn’t delete account', e instanceof Error ? e.message : 'unknown');
                    } finally {
                      setBusy(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [getIdToken, signOut]);

  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 28 }}>
      <Eyebrow style={{ color: c.ink3, paddingLeft: 6, marginBottom: 8 }}>DANGER ZONE</Eyebrow>
      <Pressable
        onPress={handleDelete}
        disabled={busy}
        style={({ pressed }) => [{
          padding: 14, borderRadius: 14, borderWidth: 1, borderColor: c.warn ?? '#c34a2c',
          backgroundColor: c.paper2,
          opacity: pressed || busy ? 0.7 : 1,
        }]}
      >
        <TText style={{ fontSize: 14, fontWeight: '500', color: c.warn ?? '#c34a2c' }}>
          {busy ? 'Deleting…' : 'Delete my account'}
        </TText>
        <TText style={{ fontSize: 11, color: c.ink3, marginTop: 4 }}>
          Hard-deletes everything. Cascades through runs, stamps, Strava tokens.
        </TText>
      </Pressable>
    </View>
  );
}
