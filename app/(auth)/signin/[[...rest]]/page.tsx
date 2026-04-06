import { SignIn } from "@clerk/nextjs";
import { AuthRedirect } from "@/components/auth-redirect";

export default function SignInPage() {
  return (
    <AuthRedirect>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
        <div className="w-full max-w-md p-4">
          <SignIn
            appearance={{
              elements: {
                formButtonPrimary: 
                  "bg-primary text-primary-foreground hover:bg-primary/90 shadow-none",
                card: "bg-card border border-border shadow-lg backdrop-blur-sm",
                headerTitle: "text-foreground",
                headerSubtitle: "text-muted-foreground",
                socialButtonsBlockButton: 
                  "bg-secondary/50 text-foreground border border-border hover:bg-accent hover:text-accent-foreground",
                socialButtonsBlockButtonText: "text-foreground",
                formFieldLabel: "text-foreground",
                formFieldInput: 
                  "bg-secondary/30 text-foreground border border-border focus:border-ring focus:ring-1 focus:ring-ring",
                footerActionText: "text-muted-foreground",
                footerActionLink: "text-primary hover:text-primary/80",
                identityPreviewText: "text-foreground",
                identityPreviewEditButtonIcon: "text-muted-foreground",
                formResendCodeLink: "text-primary hover:text-primary/80",
                otpCodeFieldInput: 
                  "bg-secondary/30 text-foreground border border-border focus:border-ring",
                formFieldWarningText: "text-destructive",
                formFieldErrorText: "text-destructive",
                form: "gap-4",
                dividerLine: "bg-border",
                dividerText: "text-muted-foreground bg-card",
              },
              layout: {
                showOptionalFields: false,
              },
            }}
            signUpUrl="/signup"
            afterSignInUrl="/trainer/programs"
          />
        </div>
      </div>
    </AuthRedirect>
  );
} 