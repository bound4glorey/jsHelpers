# Security Policy

## Supported versions

Security fixes go into the latest release. See [CHANGELOG.md](CHANGELOG.md) for versions.

## Reporting a vulnerability

Please **don't** open a public issue for a security problem. Instead, report it privately through GitHub: on the repository's **Security** tab, choose **Report a vulnerability**.

Please include what the problem is, how to reproduce it (a small code sample helps), and which browser(s) are affected. You'll get a reply as soon as possible, and a fix will be released before the details are made public.

## Scope

This is a client-side library: it runs in the user's browser, and validating in the browser is a convenience for the user, **not** a security boundary. Always validate submitted data again on the server.

Within the library, examples of security issues are: a way for text from a user, a label, or a message to be inserted into the page as HTML (everything is meant to be inserted as text), or a way to bypass a configured rule so invalid data is reported as valid.
