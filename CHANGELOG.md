# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/): a change that breaks existing code bumps the major version.

## [Unreleased]

## [1.0.0] - 2026-10-28

The first public release.

### Added

- **FormBuilder** — builds accessible form fields from a config object: label, input, optional help text behind an info button, and an error area announced to screen readers. Supports initial values, placeholders, `step`, `size`, read-only/disabled, suggestion lists (`dataList`), select options, and textareas with an expand button and optional Tab-to-spaces.
- **Per-form field lists** — `FormBuilder.createForm()` returns a `FormBuilderForm` with its own fields, `validate()`, and `createValidator()`, so several forms on one page stay separate.
- **FormValidator** — validates a list of fields, shows each field's errors on the page (as text, with `aria-invalid`), optionally lists every error in an alert, and collects the values to submit.
- **FormElement** — wraps a field (built or hand-written) with its label, error area, rules, and metadata; honors validation attributes already in the markup.
- **FieldValidation** — a field's rules: `required`, `expectedType`, `minChars`/`maxChars`, `min`/`max`, `pattern`, `options`, and `customValidator`.
- **Validation** — general type checks used by the other classes.
- **Configurable messages** — replace or translate any rule message (`messages`), the alert heading, and the message templates.
- Uses the browser's own checks for unparseable input, email/URL format, and `step`; checks `time`/`month`/`week` values in code so they behave the same in every browser.
- ES modules with a single entry point (`src/index.js`), which also sets the classes as globals.
- JSDoc for the whole public API.
- A Jasmine spec suite (900+ specs) and a demo page (`Form.html`).

[Unreleased]: https://github.com/bound4glorey/jsHelpers/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/bound4glorey/jsHelpers/releases/tag/v1.0.0
