/**
 * Returns true when hostname matches a domain exactly or as a subdomain boundary.
 * Example: "m.instagram.com" matches "instagram.com", but "evilinstagram.com" does not.
 */
export function matchesDomain(hostname: string, domain: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const target = domain.toLowerCase().replace(/\.$/, "");
  return host === target || host.endsWith(`.${target}`);
}
