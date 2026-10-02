# Security

## Authentication
- Local login for V1
- Store password hashes, never plaintext
- Use secure HTTP-only cookies for sessions

## Application Security
- Validate all input
- Use parameterized database queries
- Keep secrets outside source control
- Protect configuration changes
- Record important configuration changes

## LINE Credentials
- Store with an appropriate secret/encryption mechanism
- Mask values in the UI
- Never expose complete credentials through API responses

## Deployment
Default deployment should bind to localhost.
If exposed publicly, require:
- TLS
- Authentication
- Secure cookies
- Reverse proxy
- Firewall/network controls

## Data Safety
Require confirmation for destructive actions.
Back up the database before storing important real portfolio data.
