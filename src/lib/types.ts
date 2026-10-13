export type Settings = {
  herName: string;
  hisName: string;
  eyebrow: string;
  openingLine: string;
  letterLead: string;
  finaleLine: string;
  birthday: string;
  passphrase: string;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  seed?: boolean;
};

export type Media = {
  id: string;
  src: string;
  caption: string;
  fileName: string;
};

export type Content = {
  settings: Settings;
  notes: Note[];
  photos: Media[];
  videos: Media[];
};

export type PublicNote = {
  id: string;
  title: string;
  body: string;
};

export type PublicMedia = {
  id: string;
  src: string;
  caption: string;
};

export type PublicKeepsake = {
  locked: false;
  herName: string;
  hisName: string;
  eyebrow: string;
  openingLine: string;
  letterLead: string;
  finaleLine: string;
  birthday: string;
  notes: PublicNote[];
  photos: PublicMedia[];
  videos: PublicMedia[];
};

export type LockedKeepsake = {
  locked: true;
  herName: string;
};

export type KeepsakeResponse = PublicKeepsake | LockedKeepsake;

export type BackstageResponse =
  | { needsSetup: true; authed: false }
  | { needsSetup: false; authed: false }
  | ({ needsSetup: false; authed: true } & Content);
