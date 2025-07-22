import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components'

interface CoachMessageEmailProps {
  studentName?: string
  coachName?: string
  subject: string
  message: string
  actionUrl?: string
  actionText?: string
}

export default function CoachMessageEmail({
  studentName = 'there',
  coachName = 'Your Coach',
  subject,
  message,
  actionUrl,
  actionText = 'View in Habithletics',
}: CoachMessageEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{subject} - Message from {coachName}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto p-6 max-w-2xl">
            <Section className="bg-white rounded-lg shadow-lg p-8">
              <Section className="bg-blue-600 -m-8 mb-6 p-6 rounded-t-lg">
                <Heading className="text-2xl font-bold text-white mb-0">
                  Message from {coachName}
                </Heading>
              </Section>

              <Text className="text-gray-700 text-lg mb-2">
                Hi {studentName},
              </Text>

              <Section className="bg-gray-50 rounded-lg p-6 mb-6">
                <Heading className="text-xl font-semibold text-gray-900 mb-3">
                  {subject}
                </Heading>
                
                <Text className="text-gray-700 whitespace-pre-wrap">
                  {message}
                </Text>
              </Section>

              {actionUrl && (
                <Section className="text-center mb-6">
                  <Button
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
                    href={actionUrl}
                  >
                    {actionText}
                  </Button>
                </Section>
              )}

              <Hr className="my-6 border-gray-300" />

              <Section className="bg-green-50 border border-green-200 rounded-lg p-4">
                <Text className="text-green-800 text-sm mb-0">
                  💪 Your coach is here to support your fitness journey! Feel free to reply through the Habithletics app.
                </Text>
              </Section>

              <Hr className="my-6 border-gray-300" />

              <Text className="text-gray-500 text-sm text-center">
                This message was sent from your coach on Habithletics.{' '}
                <Link href="https://habithletics.com/dashboard/messages" className="text-blue-600">
                  View all messages
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
} 