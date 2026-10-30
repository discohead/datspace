/**
 * The catalog on datspace.music: twelve numbers, none pressed yet. A record
 * takes a number when it's released; until then its sleeve plays its picture.
 */

export interface Entry {
  /** The catalog number, printed in tabular mono: DSM001 to DSM012. */
  number: string;
  status: "unpressed";
}

export const CATALOG_SIZE = 12;

export function catalogNumber(index: number): string {
  return `DSM${String(index + 1).padStart(3, "0")}`;
}

export const CATALOG: Entry[] = Array.from({ length: CATALOG_SIZE }, (_, i) => ({
  number: catalogNumber(i),
  status: "unpressed",
}));
