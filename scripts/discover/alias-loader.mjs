/**
 * Lets Node run the site's own TypeScript (Heddle in src/lib/scan) from these scripts:
 * maps "@/x/y" to "src/x/y.ts", mirroring the tsconfig path alias. Node strips the types.
 */
const SRC = new URL("../../src/", import.meta.url);

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) return next(new URL(`${specifier.slice(2)}.ts`, SRC).href, context);
  return next(specifier, context);
}
