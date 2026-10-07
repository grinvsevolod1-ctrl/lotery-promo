import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { isUserBlocked } from "@/lib/user-block"

/**
 * Layouts and pages render in parallel, so a layout redirect does not stop a
 * page from querying data. Each protected page calls this first.
 */
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")
  if (await isUserBlocked(session.user.id)) redirect("/blocked")
  return session
}
