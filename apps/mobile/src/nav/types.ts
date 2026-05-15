import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

export type RootStackParamList = {
  Tabs: undefined;
  Onboarding: undefined;
  Activity: { id: string };
  Editor: { id: string };
  Stamps: undefined;
  YearInStamps: undefined;
};

export type TabParamList = {
  Home: undefined;
  Stats: undefined;
  Places: undefined;
  Profile: undefined;
};

export type RootStackProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
export type TabProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
