import React from 'react';
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Activity } from '../../data/models';
import { distUnit, fmtDist, fmtPace, fmtTime } from '../../lib/format';
import { Icon } from '../../design/Icon';
import { RouteMap } from '../../design/RouteMap';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';
import { useAppState } from '../../state/AppState';
import { useActivityStreams } from '../../state/useActivityStreams';

const POST_RUN_HEIGHT = 380;

// The run is the artifact. Map backdrop with the route, run title + date as
// a postmark eyebrow, the headline metric row, and a secondary HR/elev/cal
// row. Share is a small icon in the top corner; tap-anywhere-else opens
// Activity. One purpose per surface.
export function PostRunCard({ run, onOpen, onShare }: { run: Activity; onOpen: () => void; onShare: () => void }) {
  const c = useColors();
  const { units } = useAppState();
  const { route: realRoute, rawLatLng: realRawLatLng } = useActivityStreams(run.id);
  return (
    <Pressable onPress={onOpen} accessibilityLabel={`Open ${run.title}`} style={({ pressed }) => [{ borderRadius: 18, overflow: 'hidden', backgroundColor: c.ink, opacity: pressed ? 0.95 : 1 }]}>
      {/* shouldRasterizeIOS + renderToHardwareTextureAndroid: the RouteMap
          inside is a heavy SVG (raster tiles + polyline + gradient). Native
          rasterization caches the composed result as a bitmap after first
          paint so scrolling past doesn't recomposite SVG paths per frame.
          The press-state opacity sits on the parent Pressable, not on this
          view, so the cache stays valid across taps. collapsable=false
          stops RN's view-flattening from removing the rasterizing layer. */}
      <View
        collapsable={false}
        shouldRasterizeIOS
        renderToHardwareTextureAndroid
        style={{ position: 'relative', height: POST_RUN_HEIGHT }}
      >
        <View style={{ position: 'absolute', inset: 0, opacity: 0.85 }}>
          {/* animate={false} on Home — the ink-trace is a brand keystone on
              Activity / Editor / Year-in-Stamps where it's an event, but
              Home is a recurring surface (seen on every app open) and the
              per-frame SVG path animation invalidates the bitmap cache that
              shouldRasterizeIOS just set up. Killing the animation here
              keeps the cache hot from frame 1. */}
          <RouteMap points={realRoute ?? run.route} rawLatLng={realRawLatLng} width={362} height={POST_RUN_HEIGHT} style="dark" accent={c.accent} animate={false} />
        </View>
        <LinearGradient
          colors={['rgba(14,13,11,0.4)', 'rgba(14,13,11,0.1)', 'rgba(14,13,11,0.85)']}
          locations={[0, 0.35, 1]}
          style={{ position: 'absolute', inset: 0 }}
        />

        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Eyebrow style={{ color: c.accent, marginBottom: 4 }}>{run.day.toUpperCase()} · {run.time}</Eyebrow>
              <TText variant="serif" style={{ fontSize: 22, lineHeight: 24, color: c.paper, letterSpacing: -0.4 }}>{run.title}</TText>
              {!!run.place && run.place !== '—' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Icon.pin size={12} color="rgba(243,237,226,0.6)" />
                  <TText style={{ fontSize: 12, color: c.onInk3 }}>{run.place}</TText>
                </View>
              )}
            </View>
            <Pressable
              onPress={(e) => { e.stopPropagation(); onShare(); }}
              accessibilityLabel={`Open share card editor for ${run.title}`}
              hitSlop={10}
              style={({ pressed }) => [{
                width: 38, height: 38, borderRadius: 12,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: 'rgba(243,237,226,0.18)',
                backgroundColor: 'rgba(14,13,11,0.45)',
                opacity: pressed ? 0.7 : 1,
              }]}
            >
              <Icon.share size={15} color={c.paper} />
            </Pressable>
          </View>

          <View style={{ flex: 1 }} />

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
            {/* DISTANCE flex bumped to 1.4 + adjustsFontSizeToFit so big
                numbers ("18.31", "42.42") shrink to fit instead of wrapping
                to a second line. Small numbers ("5.2") stay at 46pt.
                numberOfLines=1 hard-locks against the wrap regardless of
                what the auto-shrink decides. */}
            <View style={{ flex: 1.4 }}>
              <Eyebrow style={{ color: c.onInk3, fontSize: 9 }}>DISTANCE</Eyebrow>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <TText
                  variant="monoMedium"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                  style={{ fontSize: 46, lineHeight: 54, letterSpacing: -1.4, color: c.paper }}
                >
                  {fmtDist(run.distance, units)}
                </TText>
                <TText style={{ fontSize: 14, color: c.onInk3, marginLeft: 4 }}>{distUnit(units)}</TText>
              </View>
            </View>
            <View style={{ flex: 0.85 }}>
              <Eyebrow style={{ color: c.onInk3, fontSize: 9 }}>PACE</Eyebrow>
              <TText variant="monoMedium" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontSize: 22, color: c.paper, letterSpacing: -0.2 }}>{fmtPace(run.pace, units)}</TText>
              <TText style={{ fontSize: 10, color: c.onInk3 }}>/{distUnit(units)}</TText>
            </View>
            <View style={{ flex: 1.0 }}>
              <Eyebrow style={{ color: c.onInk3, fontSize: 9 }}>TIME</Eyebrow>
              <TText variant="monoMedium" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontSize: 22, color: c.paper, letterSpacing: -0.2 }}>{fmtTime(run.seconds)}</TText>
              <TText style={{ fontSize: 10, color: c.onInk3 }}>h:m:s</TText>
            </View>
          </View>

          {(run.avgHr > 0 || run.elev > 0 || run.cal > 0) && (
            <View style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.onInkDivider
            }}>
              {run.avgHr > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Icon.heart size={12} color={c.accent} />
                  <TText variant="mono" style={{ fontSize: 11, color: c.onInk2 }}>{run.avgHr} avg · {run.maxHr} max</TText>
                </View>
              )}
              {run.elev > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Icon.mountain size={12} color="rgba(243,237,226,0.7)" />
                  <TText variant="mono" style={{ fontSize: 11, color: c.onInk2 }}>{run.elev} m</TText>
                </View>
              )}
              {run.cal > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Icon.flame size={12} color="rgba(243,237,226,0.7)" />
                  <TText variant="mono" style={{ fontSize: 11, color: c.onInk2 }}>{run.cal} kcal</TText>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
