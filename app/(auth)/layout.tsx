// Deliberately outside `(inbound)` so the sign-in page pulls in neither the
// sidebar chrome nor the `requireSession()` guard that would bounce it in a loop.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
