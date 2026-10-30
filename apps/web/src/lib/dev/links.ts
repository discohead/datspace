export const REPO = "https://github.com/discohead/datspace";

/** A file on GitHub at main, by its path in the repository. */
export function blob(path: string): string {
  return `${REPO}/blob/main/${path}`;
}

/** A directory on GitHub at main. */
export function tree(path: string): string {
  return `${REPO}/tree/main/${path}`;
}
