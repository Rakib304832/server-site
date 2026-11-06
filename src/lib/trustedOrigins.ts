const configuredOrigins = (process.env.CLIENT_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const localOrigins =
  process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000"];

export const trustedOrigins = [
  ...new Set([
    ...localOrigins,
    "https://client-site-ui.vercel.app",
    ...configuredOrigins,
  ]),
];
