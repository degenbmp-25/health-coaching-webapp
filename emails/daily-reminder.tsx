import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components'

interface DailyReminderEmailProps {
  userName?: string
  goals: Array<{
    id: string
    title: string
    description?: string
    targetDate?: string
    isCompleted: boolean
  }>
  streakCount?: number
  motivationalQuote?: string
}

export default function DailyReminderEmail({
  userName = 'there',
  goals = [],
  streakCount = 0,
  motivationalQuote = "The only bad workout is the one that didn't happen.",
}: DailyReminderEmailProps) {
  const activeGoals = goals.filter(g => !g.isCompleted)
  const completedGoals = goals.filter(g => g.isCompleted)

  return (
    <Html>
      <Head />
      <Preview>Your daily goals reminder from Habithletics</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto p-6 max-w-2xl">
            <Section className="bg-white rounded-lg shadow-lg p-8">
              <Heading className="text-3xl font-bold text-gray-900 mb-4">
                Good morning, {userName}! ☀️
              </Heading>
              
              {streakCount > 0 && (
                <Section className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <Text className="text-green-800 font-semibold text-lg">
                    🔥 {streakCount} day streak! Keep it going!
                  </Text>
                </Section>
              )}

              <Text className="text-gray-600 mb-6">
                Here&apos;s your daily reminder to stay on track with your goals.
              </Text>

              {activeGoals.length > 0 ? (
                <>
                  <Heading className="text-xl font-semibold text-gray-800 mb-4">
                    Today&apos;s Focus ({activeGoals.length} active goals)
                  </Heading>
                  
                  {activeGoals.map((goal) => (
                    <Section key={goal.id} className="border-l-4 border-blue-500 pl-4 mb-4">
                      <Text className="font-semibold text-gray-900 mb-1">
                        {goal.title}
                      </Text>
                      {goal.description && (
                        <Text className="text-gray-600 text-sm mb-1">
                          {goal.description}
                        </Text>
                      )}
                      {goal.targetDate && (
                        <Text className="text-gray-500 text-xs">
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </Text>
                      )}
                    </Section>
                  ))}
                </>
              ) : (
                <Section className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <Text className="text-blue-800">
                    You don&apos;t have any active goals yet. Set some goals to track your progress!
                  </Text>
                </Section>
              )}

              {completedGoals.length > 0 && (
                <Section className="mt-6">
                  <Text className="text-gray-500 text-sm">
                    ✅ Recently completed: {completedGoals.slice(0, 3).map(g => g.title).join(', ')}
                  </Text>
                </Section>
              )}

              <Hr className="my-6 border-gray-300" />

              <Section className="bg-purple-50 rounded-lg p-4 mb-6">
                <Text className="text-purple-800 italic text-center">
                  "{motivationalQuote}"
                </Text>
              </Section>

              <Section className="text-center">
                <Button
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
                  href="https://habithletics.com/dashboard"
                >
                  Open Dashboard
                </Button>
              </Section>

              <Hr className="my-6 border-gray-300" />

              <Text className="text-gray-500 text-sm text-center">
                You're receiving this because you have email notifications enabled.{' '}
                <Link href="https://habithletics.com/dashboard/settings" className="text-blue-600">
                  Manage preferences
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
} 