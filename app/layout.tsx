import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Health Coaching - Today\'s Workout',
  description: 'Your daily workout plan',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
