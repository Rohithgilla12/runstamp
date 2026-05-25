import { Image, Share as RNShare } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { cropFileTo } from './cropTo';
import { shareToIgStories, openInstallInstagram } from './igStories';

export type DestinationId = 'stories' | 'feed' | 'photos' | 'more';

export interface DestinationResult {
  status: 'ok' | 'permission-denied' | 'no-instagram' | 'error';
  message?: string;
}

export interface Destination {
  id: DestinationId;
  label: string;
  hint: string;
  tone: 'ig' | 'ink' | 'paper' | 'plain';
  handle: (uri: string) => Promise<DestinationResult>;
}

async function getDims(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), (e) => reject(e));
  });
}

export const STORIES: Destination = {
  id: 'stories', label: 'Stories', hint: 'DIRECT', tone: 'ig',
  async handle(uri) {
    const res = await shareToIgStories(uri);
    if (res.status === 'no-instagram') {
      await openInstallInstagram();
      return { status: 'no-instagram' };
    }
    if (res.status === 'error') return { status: 'error', message: res.message };
    return { status: 'ok' };
  },
};

export const FEED: Destination = {
  id: 'feed', label: 'IG Feed', hint: '1:1 CROP', tone: 'ink',
  async handle(uri) {
    try {
      const { width, height } = await getDims(uri);
      const cropped = await cropFileTo(uri, width, height, 1);
      await RNShare.share({ url: cropped, message: '' });
      return { status: 'ok' };
    } catch (err) {
      return { status: 'error', message: err instanceof Error ? err.message : 'Unknown error' };
    }
  },
};

export const PHOTOS: Destination = {
  id: 'photos', label: 'Photos', hint: 'SAVE', tone: 'paper',
  async handle(uri) {
    const perm = await MediaLibrary.requestPermissionsAsync(true);
    if (!perm.granted) return { status: 'permission-denied' };
    await MediaLibrary.createAssetAsync(uri);
    return { status: 'ok' };
  },
};

export const MORE: Destination = {
  id: 'more', label: 'More', hint: 'SHEET', tone: 'plain',
  async handle(uri) {
    try {
      await RNShare.share({ url: uri, message: '' });
      return { status: 'ok' };
    } catch (err) {
      return { status: 'error', message: err instanceof Error ? err.message : 'Unknown error' };
    }
  },
};

export const DESTINATIONS: Destination[] = [STORIES, FEED, PHOTOS, MORE];
