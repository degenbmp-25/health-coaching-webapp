# Habithletics

Habithletics is an open-source habit tracking app that lets you track daily habits and monitor your activity streaks and progress with little effort.

![og image](/public/og.jpg)

## Features

- Habit/Activity Tracking with Streaks
- Dashboard Analytics with Charts
- Meal Tracking with Macros
- Workout Management
- Goal Setting
- Coach-Student System
- In-app Messaging
- Email Notifications (Daily Reminders, Coach Messages)
- Clerk Authentication
- Cross-platform Support (PWA)
- Web Push Notifications (coming soon)

## Stack

- [Next.js](https://nextjs.org) `/app` dir
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com) Components
- [Clerk](https://clerk.com) Authentication
- [Prisma](https://www.prisma.io) ORM
- [Zod](https://zod.dev) Validations
- [Neon](https://neon.tech/) Database (PostgreSQL)
- [Resend](https://resend.com) Email
- [Cloudinary](https://cloudinary.com) Image Uploads

## Running Locally

1. Clone the repository.

```bash
pnpm dlx degit micic-mihajlo/Habithletics
```

2. Install dependencies using pnpm.

```bash
pnpm install
```

3. Copy `env.example` to `env.local` and update the variables.

```bash
cp .env.example .env.local
```

4. Generate prisma client before starting development server.

```bash
pnpm postinstall
```

5. Start the development server.

```bash
pnpm dev
```

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT) - see the [LICENSE](LICENSE) file for details.
