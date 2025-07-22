import { Resend } from 'resend'
import { env } from '@/env.mjs'

export const resend = new Resend(env.RESEND_API_KEY)

// use verified domain if provided otherwise fallback to resend's sandbox domain
const FROM_ADDRESS = env.RESEND_FROM ?? "Habithletics <onboarding@resend.dev>"

export async function sendEmail({
  to,
  subject,
  react,
  text,
}: {
  to: string
  subject: string
  react?: React.ReactElement
  text?: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      react,
      text,
    })

    if (error) {
      console.error('Failed to send email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
} 