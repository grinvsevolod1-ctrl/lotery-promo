import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { isUserBlocked } from "@/lib/user-block"

/** For server actions: throws instead of redirecting, the client shows the error. */
export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  if (await isUserBlocked(session.user.id)) throw new Error("Аккаунт заблокирован")
  return session.user
}

export async function getUserId() {
  return (await getSessionUser()).id
}
