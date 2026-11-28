import { PageShell } from "@/components/page-shell";
import { BackButton } from "@/components/back-button";

export default function ReceiverPage() {
  return (
    <PageShell>
      <BackButton fallbackHref="/" />
      <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Receiver link</h1>
      <p className="mt-3 text-slate-600">Secure tracking and receipt confirmation will be implemented here.</p>
    </PageShell>
  );
}
