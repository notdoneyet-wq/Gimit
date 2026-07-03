# Security Policy

## Overview

Security is a core design principle of Gimit.

The application integrates with GitHub OAuth, AI providers, and server-side APIs. We strive to follow secure development practices to protect user data, API credentials, and authentication workflows.

---

## Supported Version

| Version | Supported |
|----------|-----------|
| v1.x | ✅ Yes |

---

## Reporting a Vulnerability

If you discover a security vulnerability, please do **not** create a public GitHub issue.

Instead, contact the maintainers privately with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested mitigation (if available)

We aim to acknowledge security reports as soon as possible and resolve verified issues promptly.

---

## Security Practices

Gimit currently follows several security best practices:

### GitHub OAuth

- Secure OAuth authentication
- Server-side callback handling
- No GitHub credentials stored in the client

### API Keys

- Stored using environment variables
- Never committed to source control
- Accessed only on the server where applicable

### Server-side Validation

Incoming requests are validated before processing.

### Authentication

OAuth tokens are handled securely during authentication flows.

### Client / Server Separation

Sensitive logic remains on the backend whenever possible.

---

## Future Improvements

Planned enhancements include:

- Rate limiting
- Session management improvements
- Prompt injection protection
- Enhanced API validation
- Security middleware
- Audit logging
- Role-based access control (RBAC)

---

## Responsible Disclosure

Please allow reasonable time for investigation and remediation before publicly disclosing any vulnerabilities.

We appreciate responsible security research and community contributions.
