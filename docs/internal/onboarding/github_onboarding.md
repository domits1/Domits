# GitHub Access Guide

This document explains how developers are onboarded to the **Domits** GitHub organization, including access levels, expectations, and security requirements.

---

## 1. GitHub Organization Access

All development work happens inside the **Domits GitHub Organization**.

### Access is granted via:
- GitHub **Teams** (never individual repo permissions)
- Role-based permissions (principle of least privilege)

❌ Do not request direct repository access  
✅ Always request access via a team

---

## 2. GitHub Teams & Permissions

| Team | Description | Permission |
|----|-----------|-----------|
| `platform-core` | Architecture, releases, governance | Admin |
| `security-core` | Security, compliance, audit, risk | Admin |
| `identity-core` | Auth, crypto, encrypt, iam, rbac | Write |
| `backend-core` | API, data, integrations | Write |
| `frontend-core` | Web, mobile apps | Write |
| `quality` | Tests, quality | Write |
| `cloud-platform` | AWS, CI/CD, Terraform | Write |
| `data-platform` | Data, analytics, ml, pipelines | Write |
| `sdk` | Sdk | Write |
| `marketing` | Website, blog | Write |
| `read-only` | Auditors, stakeholders | Read |

> Team membership determines repository access automatically.

---

## 3. Onboarding Checklist (GitHub)

New developers must complete the following:

- [ ] GitHub account created (personal account with your full name)
- [ ] Added to Domits GitHub Organization
- [ ] Added to correct GitHub team(s)
- [ ] SSH key added to GitHub
- [ ] 2FA enabled on GitHub
- [ ] Read the Code of Conduct
- [ ] Read CONTRIBUTING.md

---

## 4. Required Security Settings

For all organization members:

- ✅ **Two-Factor Authentication (2FA) is mandatory**
- ✅ SSH keys or GitHub CLI authentication preferred
- ❌ No shared accounts
- ❌ No committing secrets or credentials

Accounts without 2FA may be **automatically removed**.

---

## 5. Repository Rules (Default)

All core repositories enforce:

- Protected `main` branch
- Pull Requests required
- At least 2 review approval
- Passing CI checks
- No direct pushes to `main`

CODEOWNERS are used to define review responsibility.

---

## 6. Contribution Workflow

1. Create a feature branch from `acceptance`
2. Make small, focused commits
3. Open a Pull Request
4. Request review from relevant team
5. Address feedback
6. Merge after approval

See: `CONTRIBUTING.md` for details.

---

## 7. Issue & Pull Request Templates

The following templates are used:
- Bug Report
- Feature Request
- New Developer Onboarding
- Pull Request Template

Always use templates to ensure consistency and traceability.

---

## 8. Leaving the Organization

When a developer leaves the project:
- GitHub org access is revoked
- Team memberships are removed
- SSH keys are invalidated
- Open PRs are reassigned

This process is handled by maintainers.

---

## 9. Need Help?

If you need GitHub access or changes:
- Open an issue using the **🧑‍💻 New Developer Onboarding** template
- Or contact a core maintainer

---

_Last updated: 2026
