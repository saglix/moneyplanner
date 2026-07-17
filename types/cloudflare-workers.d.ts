declare module "cloudflare:workers" {
  // This module is only available in Cloudflare runtimes. The app itself does
  // not use these bindings on Hostinger, but Next still type-checks helper files.
  export const env: any;
}
