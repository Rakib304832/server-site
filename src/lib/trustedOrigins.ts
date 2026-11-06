const productionOrigins = [
  "https://client-site-ui.vercel.app",
  "https://client-site-ui-rakib-299e.vercel.app",
  "https://client-site-ui-git-main-rakib-299e.vercel.app",
  "https://client-site-ui-git-*-rakib-299e.vercel.app",
  "https://client-site-*-rakib-299e.vercel.app",
];

const vercelOrigins = [
  process.env.VERCEL_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
]
  .filter((value): value is string => Boolean(value))
  .map((value) => (value.startsWith("http") ? value : `https://${value}`));

const configuredOrigins = (process.env.CLIENT_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

export const trustedOrigins = [
  ...new Set([...productionOrigins, ...vercelOrigins, ...configuredOrigins]),
];

function matchesOriginPattern(origin: string, pattern: string) {
  if (!pattern.includes("*")) {
    return origin === pattern;
  }

  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");

  return new RegExp(`^${escaped}$`, "i").test(origin);
}

export function isTrustedOrigin(origin?: string) {
  // Requests without an Origin header (curl, server-to-server health checks)
  // do not participate in browser CORS checks.
  if (!origin) {
    return true;
  }

  const normalizedOrigin = origin.replace(/\/+$/, "");
  return trustedOrigins.some((pattern) =>
    matchesOriginPattern(normalizedOrigin, pattern)
  );
}
