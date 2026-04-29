import { SignUp } from "@clerk/react"

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <SignUp path="/sign-up" />
    </div>
  )
}
