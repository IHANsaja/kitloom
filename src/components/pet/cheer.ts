/** Lets any part of the page tell the Purl on it that something good just happened. */
export const PURL_CHEER = "kitloom:purl-cheer";

export function cheerPurl() {
  window.dispatchEvent(new Event(PURL_CHEER));
}
