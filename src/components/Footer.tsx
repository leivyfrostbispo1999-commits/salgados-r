export function Footer() {
  return (
    <footer className="bg-black py-8 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xl font-black text-yellow-300">SALGADOS R</p>
          <p className="mt-1 text-sm font-medium text-zinc-300">
            Salgados, pasteis e sucos para pedidos rapidos.
          </p>
        </div>
        <p className="text-sm font-semibold text-zinc-400">Atendimento por WhatsApp: +55 71 99702-1801.</p>
      </div>
    </footer>
  )
}
