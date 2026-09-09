# auth.md - Agent Authentication and Registration

This document provides autonomous AI agents with instructions on how to register and authenticate with Bhavya Jangid's Portfolio APIs.

## Auth Discovery Metadata
We publish discovery metadata at standard well-known locations:
- **OAuth Protected Resource Metadata**: [oauth-protected-resource](file:///.well-known/oauth-protected-resource)
- **OAuth Authorization Server Metadata**: [oauth-authorization-server](file:///.well-known/oauth-authorization-server)

## Registration Procedure

Agents can register themselves programmatically using our **agent_auth** metadata:
1. Fetch `/.well-known/oauth-authorization-server` to obtain the registration endpoint (`register_uri`): `https://bhavyajangid.com/agent/auth`.
2. Submit a registration request to the `register_uri`.
3. The server supports the `anonymous` registration flow, which allows agents to obtain a scoped API key instantly, or `identity_assertion` using providers (like `verified_email`).

## Standard Headers
Once you have obtained credentials, include them in standard HTTP headers for protected endpoints:
```http
Authorization: Bearer YOUR_AGENT_TOKEN
```
or
```http
X-API-Key: YOUR_AGENT_API_KEY
```
