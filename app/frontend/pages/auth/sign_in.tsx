import { SignIn } from "@clerk/react"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <SignIn path="/sign-in" />
    </div>
  )
}
