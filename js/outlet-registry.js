// Outlet registry: loads outlets.yaml and resolves domains to Outlets and Outlets to Theme specs.
import { load } from "../vendor/js-yaml.mjs";

/** Bare lowercase hostname without "www.". */
export function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function toSpec(o) {
  return {
    background: String(o.background),
    text: String(o.text),
    accent: String(o.accent),
    serif: String(o.font ?? "serif").toLowerCase() !== "sans",
    band: String(o.header ?? "stripe").toLowerCase() === "band",
    weight: o.weight ?? "bold",
    nameColor: o.name_color ? String(o.name_color) : null,
    logo: o.logo ? String(o.logo) : null, // repo-relative path or image link
  };
}

/**
 * Registry for the outlets.yaml text.
 * Interface: outletForDomain(host), resolveOutlet(host, given), specFor(outletName, host).
 */
export function createRegistry(yamlText) {
  const data = load(yamlText) || {};
  const byDomain = new Map();
  const specs = new Map();
  for (const [name, o] of Object.entries(data.outlets || {})) {
    specs.set(String(name), toSpec(o));
    for (const dom of o.domains || []) byDomain.set(String(dom).toLowerCase(), String(name));
  }
  const defaultSpec = toSpec(data.default);

  /** Curated Outlet name for a hostname (subdomains match), or null. */
  function outletForDomain(host) {
    const parts = host.toLowerCase().replace(/^www\./, "").split(".");
    for (let i = 0; i < parts.length - 1; i++) {
      const hit = byDomain.get(parts.slice(i).join("."));
      if (hit) return hit;
    }
    return null;
  }

  /**
   * Pick the Outlet label. A real name wins; an empty or domain-looking one is
   * replaced by the curated name, else the bare domain.
   */
  function resolveOutlet(host, given = "") {
    given = (given || "").trim();
    if (given && !/^\S+\.\S+$/.test(given)) return given;
    return outletForDomain(host) || given || host;
  }

  /** Theme spec: by Outlet name, then by the article's domain, then the default. */
  function specFor(outletName, host) {
    return specs.get(outletName) || specs.get(outletForDomain(host) || "") || defaultSpec;
  }

  return { outletForDomain, resolveOutlet, specFor };
}

export async function loadRegistry(url = "outlets.yaml") {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  return createRegistry(await res.text());
}
