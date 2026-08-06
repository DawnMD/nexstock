import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { auth, currentUser } from "@clerk/nextjs/server";

export default async function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects to sign-in when there is no session. Every page under this layout protects itself
  // too — Next renders layouts and pages in parallel, so a layout is not an auth boundary.
  await auth.protect();

  const user = await currentUser();

  // Clerk leaves fullName null for accounts created without a first/last name,
  // so fall back through username and email before giving up.
  const email = user?.emailAddresses[0]?.emailAddress ?? "";
  const userData = {
    name: user?.fullName ?? user?.username ?? email.split("@")[0] ?? "User",
    email,
    avatar: user?.imageUrl ?? "",
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
