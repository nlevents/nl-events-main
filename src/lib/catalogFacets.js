import { flattenCategoryTree } from "../data/occasions";

const slugPath = (value) => Array.isArray(value)
  ? value.map((part) => String(part || "").trim()).filter(Boolean)
  : String(value || "").split("/").filter(Boolean);

export function catalogEntryPath(entry) {
  return Array.isArray(entry?.trail)
    ? entry.trail.slice(0, -1).map((node) => String(node?.slug || "")).filter(Boolean)
    : [];
}

export function pathStartsWith(pathValue, prefixValue) {
  const path = slugPath(pathValue);
  const prefix = slugPath(prefixValue);
  return prefix.length > 0 && prefix.length <= path.length
    && prefix.every((part, index) => path[index] === part);
}

// Build filter choices from the live category tree, not only from records that
// currently have products. This keeps every valid admin-created category and
// theme selectable; an empty result is handled by the page's existing message.
export function getCatalogFacetOptions({ occasionFilter = "all", categoryFilter = "all", subcategoryFilter = "all", taxonomyNodes = null } = {}) {
  const sourceNodes = Array.isArray(taxonomyNodes) ? taxonomyNodes : flattenCategoryTree();
  const treeNodes = sourceNodes.filter((item) => {
    const path = slugPath(item.path);
    return path.length > 0
      && path[0] !== "event-services"
      && !item.addonOnly;
  });

  const uniqueOptions = (nodes) => {
    const byPath = new Map();
    nodes.forEach((node) => {
      const path = slugPath(node.path);
      if (!path.length) return;
      const key = path.join("/");
      if (!byPath.has(key)) byPath.set(key, {
        key,
        label: node.nodeLabel || path[path.length - 1],
      });
    });
    return [...byPath.values()].sort((a, b) => a.label.localeCompare(b.label));
  };

  const occasionNodes = treeNodes.filter((node) => node.nodeType === "occasion" && slugPath(node.path).length === 1);
  const occasionOptions = uniqueOptions(occasionNodes);
  const occasionScoped = treeNodes.filter((node) => {
    const path = slugPath(node.path);
    return occasionFilter === "all" || path[0] === occasionFilter;
  });
  const categoryNodes = occasionScoped.filter((node) => node.nodeType === "category" && slugPath(node.path).length === 2);
  const categoryScoped = occasionScoped.filter((node) => {
    const path = slugPath(node.path);
    return categoryFilter === "all" || pathStartsWith(path, categoryFilter);
  });
  const subcategoryNodes = categoryScoped.filter((node) => node.nodeType === "category" && slugPath(node.path).length >= 3);
  const subcategoryScoped = categoryScoped.filter((node) => {
    const path = slugPath(node.path);
    return subcategoryFilter === "all" || pathStartsWith(path, subcategoryFilter);
  });
  const themeNodes = subcategoryScoped.filter((node) => node.nodeType === "theme");

  return {
    occasionOptions,
    categoryOptions: uniqueOptions(categoryNodes),
    subcategoryOptions: uniqueOptions(subcategoryNodes),
    themeOptions: uniqueOptions(themeNodes),
  };
}
