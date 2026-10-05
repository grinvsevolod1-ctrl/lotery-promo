import { betterAuth } from "better-auth"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { pool } from "@/lib/db"
import {
  sendChangeEmailConfirmation,
  sendDeleteAccountEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/lib/email"
import { recordReferral, REFERRAL_COOKIE } from "@/lib/referrals"

const isDev = process.env.NODE_ENV === "development"

// Vercel system variables: the stable production hostname and the hostname of
// the current deployment (both without a scheme).
const vercelProductionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
const vercelDeploymentHost = process.env.VERCEL_URL

// Public origin of the site, e.g. https://example.com. On the VPS it comes
// from BETTER_AUTH_URL; in development the v0 preview URL or localhost is
// used; on Vercel the production URL, falling back to the deployment URL.
const siteURL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  (isDev
    ? (process.env.V0_RUNTIME_URL ?? "http://localhost:3000")
    : vercelProductionHost
      ? `https://${vercelProductionHost}`
      : vercelDeploymentHost
        ? `https://${vercelDeploymentHost}`
        : undefined)

function splitList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

// Extra origins allowed to call the auth API (e.g. the www. variant of the domain).
const extraOrigins = splitList(process.env.TRUSTED_ORIGINS)

const devOrigins = isDev
  ? [
      "http://localhost:3000",
      process.env.V0_RUNTIME_URL,
      process.env.V0_DEV_APP_URL,
      process.env.V0_BUILD_URL,
      process.env.V0_SANDBOX_URL,
    ].filter((origin): origin is string => Boolean(origin))
  : []

// On Vercel the deployment may be opened through its unique URL as well as the
// production URL; both exact origins are trusted, nothing wildcarded.
const vercelOrigins = isDev
  ? []
  : [vercelProductionHost, vercelDeploymentHost]
      .filter((host): host is string => Boolean(host))
      .map((host) => `https://${host}`)

// Reverse proxies in front of `next start` (nginx/Caddy on the same host by
// default). Their hops are skipped when resolving the client IP from
// X-Forwarded-For, so rate limits apply to real visitors, not to the proxy.
const trustedProxies = splitList(process.env.TRUSTED_PROXIES ?? "127.0.0.1,::1")

// E-mail confirmation is off for now: users are signed in right after sign-up.
// Set REQUIRE_EMAIL_VERIFICATION=1 to require a confirmed address again.
const requireEmailVerification = ["1", "true", "yes"].includes(
  (process.env.REQUIRE_EMAIL_VERIFICATION ?? "").trim().toLowerCase(),
)

export const auth = betterAuth({
  database: pool,
  baseURL: siteURL,
  trustedOrigins: [...extraOrigins, ...devOrigins, ...vercelOrigins],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification,
    autoSignIn: true,
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
    sendOnSignUp: requireEmailVerification,
    sendOnSignIn: requireEmailVerification,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24, // 24 hours
  },
  user: {
    additionalFields: {
      // Set by the create hook below; never accepted from the client.
      termsAcceptedAt: { type: "date", required: false, input: false },
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        await sendChangeEmailConfirmation({ to: user.email, name: user.name, newEmail, url })
      },
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        await sendDeleteAccountEmail({ to: user.email, name: user.name, url })
      },
      deleteTokenExpiresIn: 60 * 60 * 24, // 24 hours
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({ data: { ...user, termsAcceptedAt: new Date() } }),
        after: async (createdUser, ctx) => {
          const cookieHeader = ctx?.headers?.get("cookie") ?? ctx?.request?.headers.get("cookie") ?? ""
          const cookieValue = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${REFERRAL_COOKIE}=`))?.slice(REFERRAL_COOKIE.length + 1)
          if (!cookieValue) return
          try {
            await recordReferral(createdUser.id, cookieValue)
          } catch {
            console.error("Referral attribution failed during registration")
          }
        },
      },
    },
  },
  hooks: {
    // Registration requires explicit 18+ / rules consent; the checkbox is
    // enforced here so the API cannot be called without it.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return
      const body = ctx.body as { termsAccepted?: unknown } | undefined
      if (body?.termsAccepted !== true) {
        throw new APIError("BAD_REQUEST", {
          message: "Подтвердите возраст 18+ и согласие с правилами",
          code: "TERMS_NOT_ACCEPTED",
        })
      }
    }),
  },
  rateLimit: {
    // In-memory counters are per instance and reset on every cold start.
    storage: "database",
    modelName: "rateLimit",
    window: 60,
    max: 60,
    customRules: {
      "/sign-up/email": { window: 60, max: 5 },
      "/sign-in/email": { window: 60, max: 10 },
      "/request-password-reset": { window: 60, max: 3 },
      "/send-verification-email": { window: 60, max: 3 },
      "/change-email": { window: 60, max: 3 },
      "/delete-user": { window: 60, max: 3 },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"],
      trustedProxies,
    },
    ...(isDev
      ? {
          // In dev (v0 preview iframe), force cross-site cookies so the
          // session cookie is stored by the browser.
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        }
      : {}),
  },
})
