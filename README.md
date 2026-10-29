# jsHelpers

Build and validate HTML forms in plain JavaScript — no dependencies, no build step.

- **FormBuilder** creates accessible form fields (label, input, help text, error area) from a config object.
- **FormValidator** checks them, shows the errors on the page, and collects the values to submit.
- **FormElement** wraps hand-written markup, so existing forms get the same validation.
- Every class checks its configuration up front and throws a clear error for typos and contradictions (`min` after `max`, an option the other rules would reject, a `required` field the user can't edit), so mistakes show up while you build the form, not when a user submits it.

## Contents

- [Quick start](#quick-start)
- [Validating existing markup](#validating-existing-markup)
- [The classes](#the-classes)
- [Validation rules](#validation-rules)
- [Field types](#field-types)
- [How validation behaves](#how-validation-behaves)
- [Custom messages and alerts](#custom-messages-and-alerts)
- [Installing](#installing)
- [Browser support](#browser-support)
- [Running the specs](#running-the-specs)
- [Project layout](#project-layout)
- [License](#license)

## Quick start

```html
<div id="signup"></div>
<button id="send" type="button">Sign up</button>

<script type="module">
    import { FormBuilder } from "./src/index.js";

    // A form with its own list of fields
    const form = FormBuilder.createForm();

    const fields = [
        form.createFormLine({ label: "Name", required: true, minChars: 2, metadata: { ajaxParamName: "name" } }),
        form.createFormLine({ type: "email", label: "Email", required: true, metadata: { ajaxParamName: "email" } }),
        form.createFormLine({ type: "number", label: "Age", min: 18, max: 120, metadata: { ajaxParamName: "age" } }),
        form.createFormLine({ type: "checkbox", label: "I agree to the terms", required: true, metadata: { ajaxParamName: "terms" } })
    ];
    document.getElementById("signup").append(...fields.map(field => field.container));

    document.getElementById("send").addEventListener("click", () => {
        const { isValid, errors, data } = form.validate();
        if (isValid) {
            // data = { name: "Ada", email: "ada@example.com", age: 36, terms: true }
            fetch("/signup", { method: "POST", body: JSON.stringify(data) });
        }
    });
</script>
```

`validate()` shows each field's errors in its error area, marks invalid inputs with `aria-invalid`, and returns:

| Property | What it is |
|---|---|
| `isValid` | `true` if every field passed |
| `errors` | every error: `{ field, message, fullMessage }`, e.g. `"Email" is a required field` |
| `data` | the values to submit, keyed by each field's `metadata.ajaxParamName` — `null` if anything is invalid |
| `results` | each field's full result |

Open [`Form.html`](Form.html) for a working demo of every feature.

## Validating existing markup

```html
<label for="username" id="usernameLabel">Username</label>
<input id="username" required minlength="3">
<div id="usernameError" aria-live="polite"></div>

<script type="module">
    import { FormElement, FieldValidation, FormValidator } from "./src/index.js";

    const validator = new FormValidator([
        new FormElement({
            input: document.getElementById("username"),
            labelElement: document.getElementById("usernameLabel"),
            errorMessageContainer: document.getElementById("usernameError"),
            metadata: { ajaxParamName: "username" }
        })
    ]);

    const { isValid, data } = validator.validate();
</script>
```

Validation attributes already in the markup (`required`, `minlength`, `maxlength`, `pattern`, `min`, `max`, `step`, `type="email"` …) are honored. Rules can also be given as a `FieldValidation` (`validation: new FieldValidation({ required: true, minChars: 3 })`); if both set the same rule, they must agree.

## The classes

| Class | Role |
|---|---|
| `FormBuilder` | Builds fields. Static methods use a shared field list; `FormBuilder.createForm()` returns a `FormBuilderForm` with its own. |
| `FormBuilderForm` | A form with its own field list: `createFormLine()`, `validate()`, `createValidator()`, … |
| `FormValidator` | Validates a list of fields, shows the results, collects the data. One per form. |
| `FormElement` | One field: its input, label, error area, wrapper, rules, and metadata. |
| `FieldValidation` | One field's rules. |
| `Validation` | General type checks (`isTypeOf`, `validateOption`, …) used by the others. |

Every class is documented with JSDoc, so editors show the options, return values, and errors inline. `FormElement` and `FieldValidation` objects are immutable once built (a form's or validator's field list can still change), and every config is checked up front: unknown keys throw (a typo like `requried` is an error, not silently ignored).

## Validation rules

Given to `FormBuilder` directly, or as `new FieldValidation({ ... })`:

| Rule | Applies to | Meaning |
|---|---|---|
| `required` | all | Must have a value (a checkbox: must be checked) |
| `expectedType` | all | `"string"`, `"number"`, `"boolean"`, or `"date"` — defaults to suit the field |
| `minChars` / `maxChars` | text | Length limits |
| `min` / `max` | number, date, time/month/week | Range (a number, a `Date`, or text like `"09:30"` / `"2026-06"` / `"2026-W23"`) |
| `pattern` | text | A RegExp (or string) the **whole** value must match, like the HTML attribute |
| `options` | all but checkbox | The only allowed values (for a select, also its `<option>`s) |
| `customValidator` | all | `(value, formElement) => ["error message", …]` — empty array when valid |

## Field types

`text`, `email`, `url`, `tel`, `password`, `search`, `number`, `range`, `date`, `datetime-local`, `month`, `week`, `time`, `color`, `checkbox`, `hidden`, `select`, and `textarea`.

Not supported (they don't hold a single value): radio buttons, `<select multiple>`, file inputs, and button-type inputs.

## How validation behaves

- **Errors are inserted as text, never HTML** — a message can contain whatever the user typed.
- **The browser's own checks are included**: unparseable input in a number field, malformed email addresses and URLs, and values off the field's `step`. A number field without a `step` only accepts whole numbers (as in HTML) — use `stepValue: "any"` or `0.01` for decimals.
- **Disabled fields** are skipped and not submitted. **Read-only and hidden fields** are skipped but still submitted — the same as an HTML form.
- **Values are converted**: numbers become numbers, checkboxes become `true`/`false`, dates become `Date` objects. In `data`, dates are sent as the text the input shows (`"1990-12-10"`), so they can't shift by a day across time zones.
- **Text is trimmed**, except in passwords and textareas.
- **`time`, `month`, and `week` are checked in code**, so they behave the same in browsers that don't implement those inputs (Firefox shows a plain text box for `month` and `week`).

## Custom messages and alerts

```js
form.validate({
    // replace (or translate) any rule message; @#field#@ and the rule's value can be used
    messages: { required: "Le champ @#field#@ est obligatoire", minChars: "au moins @#minChars#@ caractères" },
    // also show every error in one alert
    displayAlert: true,
    alertHeading: "Please fix the following",
    alertHandler: ({ heading, element }) => showMyModal(heading, element)
});
```

`FormValidator.defaultMessages` returns all the default messages, as a starting point for a translation.

## Installing

There's nothing to build. Either copy the `src/` folder into your project, or add it as a dependency straight from GitHub:

```bash
npm install github:bound4glorey/jsHelpers
```

```js
import { FormBuilder, FormValidator } from "my-js-helpers";
```

In a page without a bundler, load it as a module. Loading `src/index.js` also sets every class as a global, for scripts that don't import:

```html
<script type="module" src="src/index.js"></script>
```

## Browser support

Current versions of Chrome, Edge, Firefox, and Safari. The code uses modern JavaScript (private class members, static blocks, `Object.hasOwn`), so the minimums are roughly Chrome/Edge 94, Firefox 93, and Safari 16.4.

## Running the specs

The specs use [Jasmine](https://jasmine.github.io/) in the browser. ES modules don't load from `file://`, so serve the folder over HTTP — for example:

```bash
python -m http.server 8765
```

Then open <http://localhost:8765/SpecRunner.html>. Run them in both Chrome and Firefox: some behavior differs between browsers, and the specs cover both.

## Project layout

```
src/
  index.js            entry point: exports every class (and sets them as globals)
  validation.js       Validation
  fieldValidation.js  FieldValidation
  formElement.js      FormElement
  formBuilder.js      FormBuilder, FormBuilderForm
  formValidator.js    FormValidator
  fieldFormats.js     time/month/week parsing (internal)
spec/utils/           Jasmine specs, one file per class
SpecRunner.html       runs the specs in a browser
Form.html             demo of every feature
```

## License

[MIT](LICENSE) © 2026 bound4glorey
