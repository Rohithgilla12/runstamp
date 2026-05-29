import type { Layout, LayoutId } from './types';
import { THEMES } from './themes';
import { FRAMES } from './frames';
import { LAYOUT_META } from './registry.data';
import { NoneScaffolding } from './scaffolding/NoneScaffolding';
import { PostageScaffolding } from './scaffolding/PostageScaffolding';
import { PostmarkScaffolding } from './scaffolding/PostmarkScaffolding';
import { BoardingScaffolding } from './scaffolding/BoardingScaffolding';
import { PassportScaffolding } from './scaffolding/PassportScaffolding';
import { CustomsScaffolding } from './scaffolding/CustomsScaffolding';
import { EngravedScaffolding } from './scaffolding/EngravedScaffolding';
import { WaxScaffolding } from './scaffolding/WaxScaffolding';
import { MinimalScaffolding } from './scaffolding/MinimalScaffolding';
import { DateStampScaffolding } from './scaffolding/DateStampScaffolding';
import { HalftoneScaffolding } from './scaffolding/HalftoneScaffolding';
import { CyanotypeScaffolding } from './scaffolding/CyanotypeScaffolding';
import { RisoScaffolding } from './scaffolding/RisoScaffolding';

const SCAFFOLDING_BY_ID: Record<LayoutId, Layout['Scaffolding']> = {
  none: NoneScaffolding,
  postage: PostageScaffolding,
  postmark: PostmarkScaffolding,
  boarding: BoardingScaffolding,
  passport: PassportScaffolding,
  customs: CustomsScaffolding,
  engraved: EngravedScaffolding,
  wax: WaxScaffolding,
  minimal: MinimalScaffolding,
  datestamp: DateStampScaffolding,
  halftone: HalftoneScaffolding,
  cyanotype: CyanotypeScaffolding,
  riso: RisoScaffolding,
};

export const LAYOUTS: Layout[] = LAYOUT_META.map((m) => ({
  id: m.id,
  name: m.name,
  Scaffolding: SCAFFOLDING_BY_ID[m.id],
  theme: THEMES[m.id],
  frame: FRAMES[m.id],
  seed: m.seed,
}));

export const LAYOUT_IDS: LayoutId[] = LAYOUTS.map((l) => l.id);

export function layoutById(id: LayoutId): Layout | undefined {
  return LAYOUTS.find((l) => l.id === id);
}
