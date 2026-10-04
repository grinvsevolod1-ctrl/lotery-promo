"use server"

import { desc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { fundingRequest } from "@/lib/db/schema"

export type FundingRequestRow = {
  id: number
  type: string
  amount: number
  status: string
  note: string | null
  createdAt: Date
}

export async function getFundingRequests(): Promise<FundingRequestRow[]> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return db.select({
    id: fundingRequest.id, type: fundingRequest.type, amount: fundingRequest.amount,
    status: fundingRequest.status, note: fundingRequest.note, createdAt: fundingRequest.createdAt,
  }).from(fundingRequest)
    .where(eq(fundingRequest.userId, session.user.id))
    .orderBy(desc(fundingRequest.createdAt)).limit(20)
}
