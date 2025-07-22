import { SignUp } from "@clerk/nextjs";
import { AuthRedirect } from "@/components/auth-redirect";

export default function SignUpPage() {
  return (
    <AuthRedirect>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md">
          <SignUp
            appearance={{
              elements: {
                formButtonPrimary: 
                  "bg-primary text-primary-foreground hover:bg-primary/90 shadow-none",
                card: "bg-card border border-border shadow-md",
                headerTitle: "text-foreground",
                headerSubtitle: "text-muted-foreground",
                socialButtonsBlockButton: 
                  "bg-background text-foreground border border-border hover:bg-accent hover:text-accent-foreground",
                socialButtonsBlockButtonText: "text-foreground",
                formFieldLabel: "text-foreground",
                formFieldInput: 
                  "bg-background text-foreground border border-border focus:border-ring focus:ring-1 focus:ring-ring",
                footerActionText: "text-muted-foreground",
                footerActionLink: "text-primary hover:text-primary/80",
                identityPreviewText: "text-foreground",
                identityPreviewEditButtonIcon: "text-muted-foreground",
                formResendCodeLink: "text-primary hover:text-primary/80",
                otpCodeFieldInput: 
                  "bg-background text-foreground border border-border focus:border-ring",
                formFieldWarningText: "text-destructive",
                formFieldErrorText: "text-destructive",
                form: "gap-4",
              },
              layout: {
                showOptionalFields: false,
              },
            }}
            signInUrl="/signin"
            afterSignUpUrl="/dashboard"
          />
        </div>
      </div>
    </AuthRedirect>
  );
} 