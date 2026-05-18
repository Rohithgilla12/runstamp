import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NativeBottomTabScreenProps } from '@bottom-tabs/react-navigation';
import type { CompositeScreenProps } from '@react-navigation/native';

export type RootStackParamList = {
  Tabs: undefined;
  Onboarding: undefined;
  Activity: { id: string };
  Activities: undefined;
  Editor: { id: string };
  Stamps: { openStampId?: string } | undefined;
  YearInStamps: undefined;
  HealthRuns: undefined;
};

export type TabParamList = {
  Home: undefined;
  Stats: undefined;
  Places: undefined;
  Profile: undefined;
};

export type RootStackProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
export type TabProps<T extends keyof TabParamList> = CompositeScreenProps<
  NativeBottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
