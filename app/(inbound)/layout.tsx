import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireSession } from "@/lib/session";
import { SIDEBAR_COOKIE_NAME } from "@/lib/sidebar-cookie";
import { cookies } from "next/headers";

export default async function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects to sign-in when there is no session. Every page under this layout protects itself
  // too — Next renders layouts and pages in parallel, so a layout is not an auth boundary.
  const session = await requireSession();

  // `SidebarProvider` writes this cookie whenever the operator collapses the
  // sidebar; reading it here is what makes that preference survive a reload.
  // Anything other than an explicit "false" means expanded, so a missing cookie
  // keeps the default.
  const sidebarOpen =
    (await cookies()).get(SIDEBAR_COOKIE_NAME)?.value !== "false";

  // Better Auth's `name` is a required column but can be an empty string, so fall
  // back through the email local part before giving up.
  const userData = {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- `??` would not fall back on an empty string
    name: session.user.name || session.user.email.split("@")[0] || "User",
    email: session.user.email,
    avatar: session.user.image ?? "",
  };

  return (
    <SidebarProvider
      defaultOpen={sidebarOpen}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={userData} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
