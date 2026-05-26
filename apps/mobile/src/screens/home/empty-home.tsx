import React from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '../../design/Icon';
import { PostmarkMark } from '../../design/SunMark';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';

export function EmptyHome({ loading, onConnect }: { loading: boolean; onConnect: () => void }) {
  const c = useColors();
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 32, gap: 24 }}>
      <View style={{
        borderRadius: 18, padding: 24, backgroundColor: c.ink,
        alignItems: 'flex-start', overflow: 'hidden', position: 'relative',
      }}>
        <View style={{ position: 'absolute', right: -40, top: -40, opacity: 0.12 }}>
          <PostmarkMark size={200} color={c.paper} />
        </View>
        <Eyebrow style={{ color: c.accent, marginBottom: 8 }}>{loading ? 'CHECKING…' : 'NO RUNS YET'}</Eyebrow>
        <TText variant="serif" style={{ fontSize: 26, lineHeight: 28, color: c.paper, letterSpacing: -0.4 }}>
          Connect a source to{'\n'}stamp your first run.
        </TText>
        <TText style={{ fontSize: 13, color: c.onInk2, marginTop: 10, lineHeight: 18 }}>
          Runstamp reads from Strava or Apple Health. Read-only — we never write back.
        </TText>
        <Pressable
          onPress={onConnect}
          style={({ pressed }) => [{
            marginTop: 18, height: 44, paddingHorizontal: 20, borderRadius: 12,
            backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 8, opacity: pressed ? 0.85 : 1,
          }]}
        >
          <Icon.share size={14} color="#fff" />
          <TText style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>Open connections</TText>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 4, gap: 12 }}>
        <BulletRow icon="strava" label="Strava — fastest path. Pulls your whole history once you connect." color="#fc4c02" />
        <BulletRow icon="health" label="Apple Health — Apple Watch users. 90-day backfill on first sync." color="#fb466c" />
      </View>
    </View>
  );
}

function BulletRow({ icon, label, color }: { icon: 'strava' | 'health'; label: string; color: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        {icon === 'strava' ? <Icon.strava size={16} color="#fff" /> : <Icon.heart size={14} color="#fff" />}
      </View>
      <TText style={{ flex: 1, fontSize: 13, lineHeight: 18, color: c.ink2 }}>{label}</TText>
    </View>
  );
}
