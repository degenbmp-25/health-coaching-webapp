# Email Notifications Setup Guide

## Overview

Habithletics now supports email notifications with two main features:
1. **Daily Goal Reminders** - Automated emails sent each morning with user's goals
2. **Coach Messages** - Manual emails sent by coaches to their students

## Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```env
# Resend API Key (get from https://resend.com)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Cron Secret (optional, for securing cron endpoints)
CRON_SECRET=your-secret-key-here
```

### 2. Database Migration

The migration has already been created. Run:

```bash
npx prisma migrate deploy
```

### 3. Email Domain Setup

1. Sign up for [Resend](https://resend.com)
2. Verify your domain or use their testing domain
3. Update the `from` email in `/lib/email.ts` to match your verified domain

## Features

### Daily Goal Reminders

- Users can enable/disable in Settings → Notifications
- Choose notification time (5 AM - 10 AM)
- Select timezone
- Emails include:
  - Active goals list
  - Current activity streak
  - Motivational quote
  - Link to dashboard

### Coach Email Messages

Coaches can send personalized emails to students:
- Subject and message fields
- Optional action button with custom URL
- Tracked in database for audit trail

## Cron Job Configuration

### Vercel Deployment

The `vercel.json` file is configured to run the cron job hourly:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Self-Hosted

For self-hosted deployments, set up a cron job to call:

```
GET https://your-domain.com/api/cron/daily-reminders
Authorization: Bearer YOUR_CRON_SECRET
```

## API Endpoints

### Daily Reminders Cron
- `GET /api/cron/daily-reminders`
- Requires `CRON_SECRET` in Authorization header
- Sends emails to all users with matching notification time

### Send Coach Email
- `POST /api/notifications/send-email`
- Requires coach authentication
- Body:
  ```json
  {
    "studentId": "student-id",
    "subject": "Great progress!",
    "message": "Keep up the good work...",
    "actionUrl": "https://...", // optional
    "actionText": "View Workout" // optional
  }
  ```

### User Notification Settings
- `GET /api/users/me/notification-settings`
- `PATCH /api/users/me/notification-settings`
- Body for PATCH:
  ```json
  {
    "emailNotificationsEnabled": true,
    "notificationTime": "07:00",
    "timezone": "America/New_York"
  }
  ```

## Testing

### Test Daily Reminder Email
```bash
curl -X GET http://localhost:3000/api/cron/daily-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Test Coach Email
```bash
curl -X POST http://localhost:3000/api/notifications/send-email \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "studentId": "student-id",
    "subject": "Test Email",
    "message": "This is a test message"
  }'
```

## Email Templates

Templates are built with React Email and located in `/emails/`:
- `daily-reminder.tsx` - Morning goal reminder template
- `coach-message.tsx` - Coach to student message template

To preview emails in development:

```bash
npm run email:dev
```

## Troubleshooting

### Emails not sending
1. Check Resend API key is valid
2. Verify domain in Resend dashboard
3. Check user has valid email address
4. Review server logs for errors

### Cron not running
1. Verify `CRON_SECRET` matches in environment
2. Check Vercel cron logs in dashboard
3. Ensure endpoint returns 200 status

### TypeScript errors
Run `npx prisma generate` after schema changes to regenerate types. 