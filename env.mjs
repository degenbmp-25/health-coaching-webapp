import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    CLERK_SECRET_KEY: z.string().min(1).optional(),
    CLERK_WEBHOOK_SECRET: z.string().min(1).optional(),
    DATABASE_URL: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM: z.string().email().optional(),
    CRON_SECRET: z.string().min(1).optional(),
    MUX_TOKEN_ID: z.string().min(1).optional(),
    MUX_TOKEN_SECRET: z.string().min(1).optional(),
    MUX_SIGNING_KEY_ID: z.string().min(1).optional(),
    MUX_SIGNING_KEY: z.string().min(1).optional(),
    DIRECT_URL: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_APP_URL: z.string().min(1).optional(),
  },
  runtimeEnv: {
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM: process.env.RESEND_FROM,
    CRON_SECRET: process.env.CRON_SECRET,
    MUX_TOKEN_ID: process.env.MUX_TOKEN_ID,
    MUX_TOKEN_SECRET: process.env.MUX_TOKEN_SECRET,
    MUX_SIGNING_KEY_ID: process.env.MUX_SIGNING_KEY_ID,
    MUX_SIGNING_KEY: process.env.MUX_SIGNING_KEY,
    DIRECT_URL: process.env.DIRECT_URL,
  },
})
