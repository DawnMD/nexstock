import {
  SignOutButton,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold">Welcome to Shelf Sync</h1>

      <SignedOut>
        <div className="flex gap-4">
          <SignInButton mode="modal">
            <button className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600">
              Sign Up
            </button>
          </SignUpButton>
        </div>
      </SignedOut>

      <SignedIn>
        <SignOutButton>
          <button className="rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600">
            Sign Out
          </button>
        </SignOutButton>
      </SignedIn>
    </div>
  );
}
