# Communication Provider Setup

The payment reminder and receipt system supports three delivery modes:

1. `log_only`
   Use this when you want reminders and receipts stored in the database without sending them outside the app.

2. `webhook`
   Use this when you already have your own SMS/WhatsApp gateway.

3. `twilio`
   Use this for direct Twilio SMS and WhatsApp delivery.

## Log only

This is the default when no provider is configured.

```env
COMMUNICATION_PROVIDER=log_only
```

## Webhook mode

```env
COMMUNICATION_PROVIDER=webhook
COMMUNICATION_WEBHOOK_URL=https://your-service.example.com/messages
COMMUNICATION_DEFAULT_COUNTRY_CODE=+91
```

Webhook payload fields:

- `channel`
- `recipient_phone`
- `recipient_email`
- `subject`
- `message`
- `metadata`

## Twilio mode

```env
COMMUNICATION_PROVIDER=twilio
COMMUNICATION_DEFAULT_COUNTRY_CODE=+91
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_SMS_FROM=+14155550100
TWILIO_WHATSAPP_FROM=whatsapp:+14155550199
```

Notes:

- `TWILIO_SMS_FROM` can be a Twilio number or supported sender ID.
- `TWILIO_WHATSAPP_FROM` should be your WhatsApp-enabled Twilio sender.
- Student phone numbers stored as local Indian mobile numbers are normalized automatically to E.164 format.

## Apply the migration

Run this after pulling the latest backend changes:

```powershell
npm.cmd run db:migrate
```
