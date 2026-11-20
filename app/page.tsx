import { PageShell } from "@/components/page-shell";

export default function HomePage() {
  return (
    <PageShell width="wide" center>
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Beba</p>
      <h1 className="max-w-3xl text-3xl font-bold break-words sm:text-5xl lg:text-6xl">Trusted delivery coordination</h1>
      <p className="mt-5 max-w-2xl text-base text-slate-600 sm:text-lg">
        Foundation scaffold for sender, carrier, receiver, and administrator workflows.
      </p>
    </PageShell>
  );
}
