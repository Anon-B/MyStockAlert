# LINE Notification

## Role
LINE is the primary notification channel for V1.

## Notification Types
- Market open
- Market close
- Price threshold up
- Price threshold down
- System error
- Test message

## Settings
- Connection status
- Credentials
- Enable/disable notification categories
- Test notification
- Message detail options

## Security
- Store credentials securely
- Never return complete secrets to the UI
- Mask secrets in settings
- Never commit credentials to Git

## Message Content
Messages should normally include:
- Market
- Symbol
- Current price
- Percentage change
- Threshold when applicable
- Timestamp
- Alert type

## Implementation Note
Use the currently supported LINE Messaging product/API at implementation time.
Do not hard-code an obsolete integration mechanism.
