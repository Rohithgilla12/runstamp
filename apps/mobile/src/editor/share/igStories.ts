import { Linking, Platform } from 'react-native';
import Share, { Social, type ShareSingleOptions } from 'react-native-share';

export type IgStoriesResult =
  | { status: 'shared' }
  | { status: 'no-instagram' }
  | { status: 'error'; message: string };

// Push a PNG file as the background image of a new IG Story.
// iOS: UIPasteboard + instagram-stories:// URL scheme.
// Android: ACTION_SEND with the ADD_TO_STORY intent.
export async function shareToIgStories(uri: string): Promise<IgStoriesResult> {
  try {
    const ok = Platform.OS === 'ios'
      ? await Linking.canOpenURL('instagram-stories://share')
      : await Share.isPackageInstalled('com.instagram.android')
          .then((r) => r.isInstalled)
          .catch(() => false);
    if (!ok) return { status: 'no-instagram' };

    const opts: ShareSingleOptions = {
      social: Social.InstagramStories,
      backgroundImage: uri,
      appId: '',
    };
    await Share.shareSingle(opts);
    return { status: 'shared' };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export function openInstallInstagram(): Promise<void> {
  const url = Platform.OS === 'ios'
    ? 'https://apps.apple.com/app/instagram/id389801252'
    : 'market://details?id=com.instagram.android';
  return Linking.openURL(url);
}
