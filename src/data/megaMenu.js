// Data-driven category navigation and mega menus.
// Top-level navigation labels remain stable, while dropdown contents are
// generated from the current admin-managed occasion/category hierarchy and
// catalog records. This keeps the desktop menu and mobile drawer in sync.

import { getOccasions, getProducts } from "../lib/catalogStore";
import { pathFor } from "./occasions";

const CATEGORY_NAV_CONFIG = [
  { key: "birthday", label: "Kids Theme Decor", href: "/occasion/birthday", type: "mega", rootSlugs: ["birthday"] },
  { key: "balloon-decor", label: "Balloon Decor", href: "/occasion/birthday/birthday-types/theme-party", type: "mega", match: "balloon" },
  { key: "wedding", label: "Wedding", href: "/occasion/wedding", type: "mega", rootSlugs: ["wedding"] },
  { key: "anniversary", label: "Anniversary", href: "/occasion/anniversary", type: "mega", rootSlugs: ["anniversary"] },
  { key: "baby-kids", label: "Baby & Kids", href: "/occasion/baby-shower", type: "mega", panelAlign: "right", rootSlugs: ["baby-shower", "newborn-welcome", "kids-family", "annaprashan"] },
  { key: "corporate", label: "Corporate", href: "/occasion/corporate", type: "mega", panelAlign: "right", rootSlugs: ["corporate"] },
  { key: "festivals", label: "Festivals", href: "/occasion/festivals-culture", type: "mega", panelAlign: "right", rootSlugs: ["festivals-culture"] },
  { key: "cities", label: "Cities", href: "/contact", type: "cities", align: "right" },
  {
    key: "more", label: "More", href: "/gallery", type: "simple", align: "right",
    columns: [{ heading: "Explore", links: [
      { label: "Gallery", href: "/gallery" },
      { label: "All Packages", href: "/packages" },
      { label: "All Products", href: "/products" },
      { label: "Shop by Occasion", href: "/shop-by-occasion" },
      { label: "About Us", href: "/about" },
      { label: "Contact Us", href: "/contact" },
      { label: "Book an Event", href: "/book-event" },
    ] }],
  },
];

const slugOf = (node) => String(node?.slug || "").trim().toLowerCase();
const labelOf = (node) => String(node?.label || node?.name || "").trim();
const linkFor = (node, trail) => ({ label: labelOf(node), href: pathFor(trail) });

function flattenTree(nodes, ancestors = [], output = []) {
  (nodes || []).forEach((node) => {
    if (!node || !slugOf(node) || node.addonOnly || slugOf(node) === "event-services") return;
    const trail = [...ancestors, node];
    output.push({ node, trail });
    flattenTree(node.children, trail, output);
  });
  return output;
}

function uniqueLinks(links) {
  const seen = new Set();
  return links.filter((link) => {
    if (!link?.href || !link?.label || seen.has(link.href)) return false;
    seen.add(link.href);
    return true;
  });
}

function resolveRoots(config, treeEntries) {
  if (config.match) {
    const matches = treeEntries.filter(({ node }) =>
      `${slugOf(node)} ${labelOf(node).toLowerCase()}`.includes(config.match.toLowerCase())
    );
    // Keep the shallowest matching nodes; their descendants are listed in the
    // next column, avoiding repeated nested matches in the root column.
    return matches.filter((candidate) => !matches.some((other) =>
      other.trail.length < candidate.trail.length &&
      candidate.trail.slice(0, other.trail.length).every((part, i) => slugOf(part) === slugOf(other.trail[i]))
    ));
  }
  const wanted = new Set(config.rootSlugs || []);
  return treeEntries.filter(({ node, trail }) => trail.length === 1 && wanted.has(slugOf(node)));
}

function packageMatchesRoots(product, roots, config) {
  if (product?.catalogKind !== "package") return false;
  const text = [product.name, product.slug, product.description, product.shortDesc,
    ...(Array.isArray(product.packageOccasions) ? product.packageOccasions.map((item) => typeof item === "string" ? item : JSON.stringify(item)) : []),
    ...(Array.isArray(product.categoryPaths) ? product.categoryPaths.map((path) => Array.isArray(path) ? path.join(" ") : String(path)) : []),
    ...(Array.isArray(product.categoryPath) ? product.categoryPath : []),
  ].join(" ").toLowerCase();
  if (config.match) return text.includes(config.match.toLowerCase());
  return roots.some(({ node }) => text.includes(slugOf(node)) || text.includes(labelOf(node).toLowerCase()));
}

function makeDynamicMenu(config, treeEntries, products) {
  const roots = resolveRoots(config, treeEntries);
  if (!roots.length) {
    // A deleted/renamed category should not leave stale hard-coded links in
    // the menu. Keep a useful route to the catalog root instead.
    return { ...config, columns: [
      { heading: `Browse ${config.label}`, links: [{ label: `All ${config.label}`, href: config.href }] },
      { heading: "Packages", links: [{ label: "View All Packages", href: "/packages" }] },
    ] };
  }

  const rootLinks = roots.map(({ node, trail }) => linkFor(node, trail));
  const categoryNodes = roots.flatMap(({ node, trail }) => (node.children || [])
    .filter((child) => child && !child.addonOnly && slugOf(child) !== "event-services")
    .map((child) => ({ node: child, trail: [...trail, child] })));
  const directLinks = categoryNodes.map(({ node, trail }) => linkFor(node, trail));

  // Keep the full hierarchy grouped under its parent category. This avoids
  // flattening every subcategory/theme into one long horizontal strip.
  const subcategoryGroups = categoryNodes.map(({ node, trail }) => {
    const descendants = treeEntries
      .filter(({ trail: candidateTrail }) => candidateTrail.length > trail.length &&
        trail.every((part, i) => slugOf(part) === slugOf(candidateTrail[i])))
      .map(({ node: descendant, trail: descendantTrail }) => linkFor(descendant, descendantTrail));
    return {
      heading: labelOf(node),
      href: pathFor(trail),
      links: uniqueLinks(descendants),
    };
  }).filter((group) => group.links.length > 0);

  const relevantPackages = products.filter((product) => packageMatchesRoots(product, roots, config));
  const packageLinks = relevantPackages.slice(0, 8).map((product) => ({
    label: labelOf(product),
    href: product?.id
      ? `/package-details?id=${encodeURIComponent(product.id)}`
      : "/packages",
  })).filter((link) => link.label);
  packageLinks.push({ label: "View All Packages", href: "/packages" });

  const featuredPackage = relevantPackages.find((product) => product.image || product.name);
  const featuredRoot = roots.find(({ node }) => node.image || node.heroImg) || roots[0];
  const featured = featuredPackage ? {
    img: featuredPackage.image || featuredRoot.node.image || featuredRoot.node.heroImg || "",
    title: labelOf(featuredPackage) || config.label,
    subtitle: String(featuredPackage.shortDesc || featuredPackage.description || `Explore ${config.label.toLowerCase()} packages`).trim(),
    href: featuredPackage?.id
      ? `/package-details?id=${encodeURIComponent(featuredPackage.id)}`
      : "/packages",
  } : {
    img: featuredRoot.node.heroImg || featuredRoot.node.image || "",
    title: labelOf(featuredRoot.node) || config.label,
    subtitle: String(featuredRoot.node.tagline || featuredRoot.node.description || `Explore ${config.label.toLowerCase()}`).trim(),
    href: pathFor(featuredRoot.trail),
  };

  return {
    ...config,
    featured,
    columns: [
      {
        heading: roots.length > 1 ? "Occasions" : "Occasion",
        links: uniqueLinks(rootLinks),
      },
      {
        heading: "Categories",
        links: uniqueLinks(directLinks),
      },
      {
        heading: "Subcategories & Themes",
        links: [],
        groups: subcategoryGroups,
      },
      {
        heading: "Packages",
        links: uniqueLinks(packageLinks),
      },
    ],
  };
}

// Called on initial render and whenever the catalog emits
// `nle-catalog-updated`, so admin-created/renamed/deleted categories and
// packages are reflected in both desktop and mobile dropdowns.
export function getCategoryNav() {
  const occasions = getOccasions();
  const treeEntries = flattenTree(occasions);
  const products = getProducts();
  return CATEGORY_NAV_CONFIG.map((config) =>
    config.type === "mega" ? makeDynamicMenu(config, treeEntries, products) : config
  );
}
