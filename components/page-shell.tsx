const WIDTH = {
  auth: "max-w-md",
  narrow: "max-w-3xl",
  medium: "max-w-4xl",
  wide: "max-w-5xl",
} as const;

export function PageShell({
  children,
  width = "narrow",
  center = false,
}: {
  children: React.ReactNode;
  width?: keyof typeof WIDTH;
  center?: boolean;
}) {
  return (
    <main
      className={`mx-auto w-full min-h-dvh px-4 py-6 sm:px-6 sm:py-12 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] ${WIDTH[width]} ${center ? "flex flex-col justify-center" : ""}`}
    >
      {children}
    </main>
  );
}
