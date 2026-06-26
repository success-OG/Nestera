Email Template Management — Design & API

Schema
- `email_templates` — id (uuid), name (unique), description, createdAt, updatedAt
- `email_template_versions` — id (uuid), template_id, version (int), subject, html, text, metadata (jsonb), active, createdAt, updatedAt
- `email_ab_tests` — id (uuid), name, template_id, createdAt
- `email_ab_variants` — id (uuid), ab_test_id, version_id, weight (int), key

APIs (HTTP)
- POST `/email-templates` — create template { name, description }
- GET `/email-templates/:id` — fetch template with versions
- PUT `/email-templates/:id` — update template
- DELETE `/email-templates/:id` — delete template
- POST `/email-templates/:id/versions` — create a version { subject, html, text, metadata, active }
- GET `/email-templates/versions/:vid` — fetch a version
- POST `/email-templates/versions/:vid/preview` — preview rendered output; body: { variables: { ... } }
- POST `/email-templates/ab-tests` — create AB test { name, templateId, variants: [{versionId, weight, key}] }
- POST `/email-templates/ab-tests/:id/preview?seed=123` — preview chosen variant with variables

Variable substitution
- Simple engine replaces `{{variable}}` and supports dotted paths like `{{user.name}}`.
- Used for both HTML and plain text previews.

Versioning
- Each new version increments `version` and is stored immutably; `active` flags can mark the one in use.

A/B testing
- An AB test references a template and multiple variants (versions) with integer weights; selection uses weighted random or an optional seed for deterministic previews.
