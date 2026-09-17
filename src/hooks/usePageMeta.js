import { useEffect } from "react";

const SITE_URL = "https://nextlevelevents.in";
const DEFAULT_IMAGE = SITE_URL + "/assets/images/brand/logo.png";

function setMeta(selector, attr, value) {
  let tag = document.querySelector(selector);
  if (!tag) {
    tag = document.createElement("meta");
    const match = selector.match(/\[([a-z]+)="([^"]+)"\]/);
    if (match) tag.setAttribute(match[1], match[2]);
    document.head.appendChild(tag);
  }
  tag.setAttribute(attr, value);
}

function setLink(rel, href) {
  let tag = document.querySelector('link[rel="' + rel + '"]');
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
}

// Keeps <title>, meta description, canonical link, Open Graph and Twitter
// Card tags in sync with the page currently being viewed. Every route calls
// this with its own title/description so search engines and link-preview
// bots (WhatsApp, Facebook, etc.) see accurate, page-specific metadata
// rather than the same generic homepage tags everywhere.
//
// options:
//   image   — absolute image URL for social previews (defaults to the logo)
//   noindex — set true for thin/utility pages (404, booking confirmation)
//             that shouldn't be indexed or shown in search results
export default function usePageMeta(title, description, options) {
  const { image, noindex } = options || {};

  useEffect(() => {
    if (title) document.title = title;
    if (description) setMeta('meta[name="description"]', "content", description);

    // Signals the index.html boot-loader (see index.html + #nle-loader) that
    // the current page's real content has mounted, so it can fade out.
    // Every route calls this hook on mount, so this fires for whichever page
    // is the actual entry point — Home in the common case, or any page
    // someone deep-links to directly.
    window.dispatchEvent(new Event("nle:app-ready"));

    const url = SITE_URL + window.location.pathname + window.location.search;
    setLink("canonical", url);

    setMeta('meta[name="robots"]', "content", noindex ? "noindex, follow" : "index, follow");

    if (title) {
      setMeta('meta[property="og:title"]', "content", title);
      setMeta('meta[name="twitter:title"]', "content", title);
    }
    if (description) {
      setMeta('meta[property="og:description"]', "content", description);
      setMeta('meta[name="twitter:description"]', "content", description);
    }
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:image"]', "content", image || DEFAULT_IMAGE);
    setMeta('meta[name="twitter:image"]', "content", image || DEFAULT_IMAGE);
  }, [title, description, image, noindex]);
}
