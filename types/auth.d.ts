import { User as PrismaUser } from "@prisma/client"

export type User = PrismaUser

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: string
    }
  }
}
