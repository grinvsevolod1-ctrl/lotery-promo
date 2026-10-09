import { Database } from "lucide-react"
import { isVaultConfigured, isVaultUnlocked } from "@/lib/vault-auth"
import { listVaultFiles, vaultTotals } from "@/lib/vault-files"
import { VaultLoginForm } from "@/components/vault/vault-login-form"
import { VaultShell } from "@/components/vault/vault-shell"
import { FileList } from "@/components/vault/file-list"
import { UploadBox } from "@/components/vault/upload-box"

export const dynamic = "force-dynamic"

export default async function VaultPage() {
  if (!(await isVaultUnlocked())) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Database className="size-6" aria-hidden />
          </span>
          <h1 className="mt-5 font-display text-xl font-extrabold">Хранилище</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isVaultConfigured() ? "Файлы, присланные в бота. Доступ по секретному паролю." : "Задайте VAULT_SECRET в .env сервера, чтобы включить доступ."}
          </p>
          <div className="mt-6">
            <VaultLoginForm />
          </div>
        </div>
      </main>
    )
  }

  const [files, totals] = await Promise.all([listVaultFiles(), vaultTotals()])
  return (
    <VaultShell totals={totals}>
      <div className="flex flex-col gap-8">
        <UploadBox />
        <FileList files={files.map((f) => ({ ...f, receivedAt: f.receivedAt.toISOString() }))} />
      </div>
    </VaultShell>
  )
}
