import { Resend } from 'resend'

// use verified domain if provided otherwise fallback to resend's sandbox domain
const FROM_ADDRESS = process.env.RESEND_FROM ?? "Habithletics <onboarding@resend.dev>"

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
    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
      console.error('Email send error: RESEND_API_KEY is not configured')
      return { success: false, error: 'RESEND_API_KEY is not configured' }
    }

    const resend = new Resend(apiKey)

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
