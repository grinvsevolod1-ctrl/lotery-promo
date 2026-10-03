function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-3xl bg-foreground/10 ${className}`} aria-hidden />
}

export default function CabinetLoading() {
  return (
    <div className="flex flex-col gap-8" role="status" aria-label="Загружаем кабинет">
      <div className="flex items-center gap-4">
        <Block className="size-14 rounded-2xl" />
        <div className="flex flex-col gap-2">
          <Block className="h-7 w-48 rounded-xl" />
          <Block className="h-4 w-36 rounded-lg" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Block className="h-32" />
        <Block className="h-32" />
        <Block className="h-32" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Block className="h-48" />
        <Block className="h-48" />
      </div>
      <Block className="h-96" />
      <span className="sr-only">Загрузка…</span>
    </div>
  )
}
