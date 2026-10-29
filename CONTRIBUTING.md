# Contributing

Thanks for helping out! Bug reports, fixes, and ideas are all welcome.

## Reporting a bug

[Open an issue](https://github.com/bound4glorey/jsHelpers/issues/new/choose) with:

- what you did (a small code sample is ideal),
- what you expected, and what happened instead,
- **which browser and version** — some behavior differs between browsers (Firefox, for example, doesn't implement `month`/`week` inputs).

For a security problem, please don't open a public issue — see [SECURITY.md](SECURITY.md).

## Making a change

1. Fork the repo and create a branch for your change.
2. Make the change in `src/`. There's no build step.
3. Add or update specs in `spec/utils/` — every fix and feature should come with a spec that fails without it.
4. Run the specs (below) in **both Chrome and Firefox**, and check [`Form.html`](Form.html) still works.
5. Update the JSDoc for anything public you changed, and add a line to the `[Unreleased]` section of [CHANGELOG.md](CHANGELOG.md).
6. Open a pull request describing what changed and why.

### Running the specs

ES modules don't load from `file://`, so serve the folder over HTTP:

```bash
python -m http.server 8765
```

Then open <http://localhost:8765/SpecRunner.html>. Any static server works.

## Code style

- Match the surrounding code: 4-space indentation, double quotes, semicolons, LF line endings ([.editorconfig](.editorconfig) sets these up in most editors).
- Public classes, methods, and options get JSDoc; private helpers get a plain comment saying *why*, not just what.
- Configs are checked up front: unknown keys and invalid or contradictory options throw a clear error that starts with the class name (e.g. `FormBuilder: "label" is required…`).
- Text from users or labels goes into the page as text, never as HTML.
- One logical change per commit, with a message explaining the reason for it.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By taking part, you agree to uphold it.
