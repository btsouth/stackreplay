/**
 * The Workers runtime module that exposes bindings. It exists only under
 * workerd; `lib/share-link-store.ts` imports it dynamically and falls back
 * when it is absent (the Node server the end-to-end suite runs).
 */
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
