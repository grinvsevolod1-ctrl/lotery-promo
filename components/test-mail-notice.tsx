import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type TestMail = { subject: string; url: string | null }

/** Reads the `testMail` field that the auth API adds in MAIL_TEST_MODE. */
export function getTestMail(data: unknown): TestMail[] | null {
  if (!data || typeof data !== "object") return null
  const letters = (data as { testMail?: unknown }).testMail
  if (!Array.isArray(letters) || letters.length === 0) return null
  return letters
    .filter((l): l is TestMail => Boolean(l) && typeof l === "object" && typeof (l as TestMail).subject === "string")
    .map((l) => ({ subject: l.subject, url: typeof l.url === "string" ? l.url : null }))
}

export function TestMailNotice({ letters }: { letters: TestMail[] | null }) {
  if (!letters || letters.length === 0) return null
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-2xl border border-dashed border-gold/50 bg-gold/10 px-4 py-3 text-sm text-pretty"
    >
      <p className="text-gold">
        <span className="font-bold">Тестовый режим:</span> письма не отправляются. Вместо почтового ящика ссылка
        из письма показана здесь.
      </p>
      {letters.map((letter, index) => (
        <div key={`${letter.subject}-${index}`} className="flex flex-col gap-2">
          <p className="text-muted-foreground">Письмо: «{letter.subject}»</p>
          {letter.url ? (
            <Link href={letter.url} className={cn(buttonVariants({ variant: "secondary" }), "w-full font-bold")}>
              Открыть ссылку из письма
            </Link>
          ) : (
            <p className="text-muted-foreground">В этом письме нет ссылки.</p>
          )}
        </div>
      ))}
    </div>
  )
}
