// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = "Jeff Baumes";
export const SITE_DESCRIPTION =
  "Hey all.";
export const TWITTER_HANDLE = "@yourtwitterhandle";
export const MY_NAME = "Jeff Baumes";

// setup in astro.config.mjs
const BASE_URL = new URL(import.meta.env.SITE);
export const SITE_URL = BASE_URL.origin;
