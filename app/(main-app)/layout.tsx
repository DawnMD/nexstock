import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { RedirectToSignIn } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

export default async function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  // If the user is not signed in, redirect to the sign in page
  if (!user) {
    return <RedirectToSignIn />;
  }

  const userData = {
    name: user.fullName!,
    email: user.emailAddresses[0]!.emailAddress,
    avatar: user.imageUrl,
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
      <SidebarInset>
        <SiteHeader />
        <main className="px-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
