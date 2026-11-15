# Security policy

## Reporting a vulnerability

Do **not** open a public issue for a vulnerability.

Use GitHub's private vulnerability reporting on this repository: **Security → Advisories → Report a vulnerability**. If that channel is unavailable, contact the organization owners through GitHub and ask for a private channel.

Include:

- the affected SDK, version, and language runtime;
- the app and engine versions, if relevant;
- a minimal reproduction, with secrets removed;
- the impact you believe it has;
- whether you want public credit.

Do not include proxy credentials, real IP addresses, profile data, cookies, or API keys in the report. If a credential was exposed, rotate it before reporting.

## Scope

In scope:

- the SDK sources in this repository;
- the wire contract, schemas, and conformance cases;
- documentation that could cause an insecure integration;
- supply-chain issues in the build and release process.

Out of scope:

- the Ombra engine and desktop app (separate repositories and disclosure processes);
- third-party sites, detectors, or anti-bot services;
- detection bypass results, CAPTCHA outcomes, or "stealth failed" reports;
- vulnerabilities that require the attacker to already control the local user account;
- social engineering and physical access.

## What to expect

This is an early-stage project. We aim to:

- acknowledge a report within 5 business days;
- confirm or reject the impact within 10 business days;
- ship a fix or a mitigation plan before public disclosure;
- credit the reporter unless anonymity is requested.

These are targets, not a contractual SLA.

## Disclosure

We prefer coordinated disclosure. We will agree on a date with the reporter, usually after a fix is available. If the issue is already public or actively exploited, we may disclose earlier.

## Safe harbor

We will not pursue legal action for research that:

- stays within the scope above;
- uses test accounts and systems you are authorized to access;
- avoids privacy violations, data destruction, and service disruption;
- reports the issue privately and gives us a reasonable window to fix it.

Testing third-party sites without authorization is not covered by this policy.

## Supported versions

The repository is at contract `0.1.0` and no SDK package has been released. Once packages are published, the supported window is defined in [docs/versioning.md](docs/versioning.md): the latest minor and the previous minor.

## Hardening notes for integrators

- Keep the Local API on loopback. Do not expose it through a reverse proxy or a tunnel.
- Enable the API key if other local users share the machine.
- Do not log the `Authorization` header, proxy credentials, or profile cookies.
- Treat the CDP endpoint as a full-control interface: anyone who can reach it can drive the browser.
- Pin SDK versions and verify package signatures or hashes where the registry supports it.
