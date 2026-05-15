// Share-card template definitions. JSON-as-code, OSS-contributable.
// v0.1 launch ships ~12 templates: Postage, Postmark, Passport, Boarding Pass,
// Customs Form, Engraved, Wax Seal, Halftone, Riso, Cyanotype, Date Stamp, Minimal.
export type StampTier = 'common' | 'rare' | 'mythic';
export type ShareSurface = '9:16' | '1:1' | '4:5';

export interface TemplateDef {
  id: string;
  name: string;
  family:
    | 'postage'
    | 'postmark'
    | 'passport'
    | 'boarding'
    | 'customs'
    | 'engraved'
    | 'wax'
    | 'halftone'
    | 'riso'
    | 'cyanotype'
    | 'date'
    | 'minimal';
  surfaces: ShareSurface[];
}
