import type { Reroute } from "@sveltejs/kit/hooks";

/** Each band's front page, on its own domain. datspace.studio is patter's, so it isn't here. */
const FRONT_PAGES: Record<string, string> = {
  "datspace.ai": "/ai",
  "datspace.dev": "/dev",
  "datspace.fm": "/fm",
  "datspace.music": "/music",
};

/**
 * On a band's domain, "/" is that band's front page. datspace-ai rewrites full
 * page loads the same way, so a reload and a client-side navigation to "/"
 * land on the same page. The address bar keeps "/".
 */
export const reroute: Reroute = ({ url }) => {
  if (url.pathname === "/") return FRONT_PAGES[url.hostname];
};
