import { adminLogout } from "@/app/actions/admin"
import { getAdminCounts } from "@/lib/admin-counts"
import { AdminNavTabs, type AdminTabKey } from "@/components/admin/admin-nav-tabs"

export async function AdminNav({ active, subtitle }: { active: AdminTabKey; subtitle: string }) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Админ-панель</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/admin/api-docs"
            download
            className="rounded-full border border-border/60 px-4 py-2 text-sm text-foreground hover:bg-foreground/5"
          >
            Документация API
          </a>
          <form action={adminLogout}>
            <button type="submit" className="rounded-full border border-border/60 px-4 py-2 text-sm text-foreground hover:bg-foreground/5">
              Выйти
            </button>
          </form>
        </div>
      </div>
      <AdminNavTabs active={active} initial={await getAdminCounts()} />
    </header>
  )
}
