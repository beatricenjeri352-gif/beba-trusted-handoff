import { updateSupabaseSession } from "@/lib/supabase/middleware";

export async function proxy(request: Parameters<typeof updateSupabaseSession>[0]) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
