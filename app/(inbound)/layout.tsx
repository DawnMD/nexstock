import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireSession } from "@/lib/session";

export default async function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects to sign-in when there is no session. Every page under this layout protects itself
  // too — Next renders layouts and pages in parallel, so a layout is not an auth boundary.
  const session = await requireSession();

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
