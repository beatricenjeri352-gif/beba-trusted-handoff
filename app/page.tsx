import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col bg-[#f7f6f0] px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <p className="text-xl font-black tracking-tight text-emerald-800">beba<span className="text-amber-500">.</span></p>

        <div className="flex flex-1 flex-col justify-center py-12">
          <div aria-hidden="true" className="relative mx-auto mb-12 flex h-52 w-52 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
            <div className="absolute inset-5 rounded-full border border-dashed border-emerald-300" />
            <div className="absolute inset-10 rounded-full border border-emerald-200" />
            <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-emerald-800 text-5xl font-black text-white shadow-xl shadow-emerald-900/20">b</div>
            <span className="absolute right-4 top-8 h-4 w-4 rounded-full bg-amber-400" />
            <span className="absolute bottom-8 left-4 h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">A better way to connect</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">Moving things,<br />made personal.</h1>
          <p className="mt-5 text-base leading-7 text-slate-600">Connect with carriers and coordinate deliveries, all in one place.</p>
        </div>

        <div className="space-y-3">
          <Link href="/login?mode=signup" className="flex min-h-14 items-center justify-center rounded-2xl bg-emerald-800 px-5 font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">Create an account</Link>
          <Link href="/login" className="flex min-h-14 items-center justify-center rounded-2xl border border-emerald-800 px-5 font-semibold text-emerald-900 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">I already have an account</Link>
        </div>
      </div>
    </main>
  );
}
