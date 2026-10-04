import { auth } from "@/lib/auth"
import { withMailCapture } from "@/lib/mail-capture"
import { toNextJsHandler } from "better-auth/next-js"

const handler = toNextJsHandler(auth)

export const GET = (request: Request) => withMailCapture(() => handler.GET(request))
export const POST = (request: Request) => withMailCapture(() => handler.POST(request))
