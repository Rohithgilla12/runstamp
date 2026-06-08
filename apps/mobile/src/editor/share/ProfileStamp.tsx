import React from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { TText } from '../../design/typography';
import { profileUrl } from './profileUrl';

// A QR styled as a perforated postage stamp, linking to the public profile page at runstamp.gilla.fun/u/<handle>.
// Rendered via react-native-svg so react-native-view-shot captures it cleanly.
export function ProfileStamp({ handle }: { handle: string }) {
  const ink = '#14110d';
  const paper = '#f3ede2';
  const solar = '#e85d2f';
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View
        style={{
          padding: 8,
          backgroundColor: paper,
          borderWidth: 1.5,
          borderColor: ink,
          borderStyle: 'dashed',
          borderRadius: 6,
          alignItems: 'center',
        }}
      >
        <QRCode value={profileUrl(handle)} size={56} color={ink} backgroundColor={paper} />
        <View style={{ width: 18, height: 2, backgroundColor: solar, marginTop: 4 }} />
      </View>
      <TText variant="mono" style={{ fontSize: 8, color: ink, letterSpacing: 0.5 }}>
        @{handle}
      </TText>
    </View>
  );
}
