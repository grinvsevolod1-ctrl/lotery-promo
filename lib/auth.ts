import { betterAuth } from "better-auth"
import { pool } from "@/lib/db"
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email"

const isDev = process.env.NODE_ENV === "development"

// Public origin of the site, e.g. https://example.com. On the VPS it comes
// from BETTER_AUTH_URL; in development the v0 preview URL or localhost is used.
const siteURL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  (isDev ? (process.env.V0_RUNTIME_URL ?? "http://localhost:3000") : undefined)

// Extra origins allowed to call the auth API (e.g. the www. variant of the domain).
const extraOrigins = (process.env.TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

const devOrigins = isDev
  ? [
      "http://localhost:3000",
      process.env.V0_RUNTIME_URL,
      process.env.V0_DEV_APP_URL,
      process.env.V0_BUILD_URL,
      process.env.V0_SANDBOX_URL,
    ].filter((origin): origin is string => Boolean(origin))
  : []

export const auth = betterAuth({
  database: pool,
  baseURL: siteURL,
  trustedOrigins: [...extraOrigins, ...devOrigins],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ to: user.email, name: user.name, url })
    },
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({ to: user.email, name: user.name, url })
    },
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24, // 24 hours
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  ...(isDev
    ? {
        advanced: {
          // In dev (v0 preview iframe), force cross-site cookies so the
          // session cookie is stored by the browser.
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        },
      }
    : {}),
})
