import { Validation } from "./validation.js";
import { FormElement } from "./formElement.js";
import { isTextFormatType, parseTextFormat } from "./fieldFormats.js";

/**
 * One validation error.
 * @typedef {object} FieldError
 * @property {string} field The field's label ("This field" if it has none).
 * @property {string} message What's wrong, e.g. "is a required field".
 * @property {string} fullMessage The message filled into the field
 *   template, e.g. `"Email" is a required field`.
 */

/**
 * One field's result, from {@link FormValidator.validateSingleInput}.
 * @typedef {object} FieldResult
 * @property {boolean} isValid Whether the field passed every rule.
 * @property {FieldError[]} errors Every rule it failed (empty if valid).
 * @property {*} value The converted value: a number, Date, boolean, text,
 *   or null when blank. Unparseable text is returned as-is.
 * @property {*} submitValue What {@link FormValidator.getAjaxParamList}
 *   sends: the value, except a date, which is its text (e.g. "1990-12-10").
 * @property {boolean} disabled True if the field was disabled (skipped,
 *   and not submitted).
 */

/**
 * One field's result in a group, from
 * {@link FormValidator#validateFormGroupInputs}.
 * @typedef {FieldResult & { metadata: Readonly<Record<string | symbol, *>> | null }} GroupFieldResult
 */

/**
 * Replacements for any of the rule messages (e.g. to translate them).
 * Each can use @#field#@ (the field's label) and the placeholder shown.
 * See {@link FormValidator.defaultMessages} for the defaults.
 * @typedef {object} ValidationMessages
 * @property {string} [required] "is a required field"
 * @property {string} [type] Uses @#expectedType#@.
 * @property {string} [email] A malformed email address.
 * @property {string} [url] A malformed URL.
 * @property {string} [minChars] Uses @#minChars#@.
 * @property {string} [maxChars] Uses @#maxChars#@.
 * @property {string} [min] Uses @#min#@.
 * @property {string} [max] Uses @#max#@.
 * @property {string} [step] Uses @#step#@.
 * @property {string} [pattern] "does not match the required format"
 * @property {string} [options] "must be one of the allowed options"
 */

/**
 * Shows the alert listing every error.
 * @callback AlertHandler
 * @param {{ heading: string, element: HTMLElement }} alert The heading,
 *   and an element holding the instructions and one line per error.
 * @returns {void}
 */

/**
 * Options for {@link FormValidator#validate}. Templates can use
 * @#field#@, @#message#@, and @#fullMessage#@.
 * @typedef {object} ValidateOptions
 * @property {string} [inputErrorMessage="@#fullMessage#@"] Template for
 *   each line in a field's error container.
 * @property {string} [fullMessageTemplate] Template for each error's
 *   fullMessage (default `"@#field#@" @#message#@`).
 * @property {boolean} [displayAlert=false] Also show every error in one alert.
 * @property {string | null} [alertInstructions] Text shown above the errors in the alert.
 * @property {string} [alertErrorTemplate="@#fullMessage#@"] Template for each alert line.
 * @property {AlertHandler | null} [alertHandler] Shows the alert (default:
 *   a global `$PCCDB.alert`, if there is one).
 * @property {string} [alertHeading="Error..."] The alert's heading.
 * @property {ValidationMessages | null} [messages] Replacements for rule messages.
 */

/**
 * Options for {@link FormValidator#validateFormGroupInputs}: the same as
 * {@link ValidateOptions}, plus which fields to check.
 * @typedef {ValidateOptions & {
 *   inputContainers?: import("./formElement.js").FormElement | import("./formElement.js").FormElement[] | null
 * }} GroupValidateOptions
 */

/**
 * The outcome of {@link FormValidator#validate}.
 * @typedef {object} ValidateOutcome
 * @property {boolean} isValid True if every field passed.
 * @property {FieldError[]} errors Every error, from every field.
 * @property {Record<string, *> | null} data The values to submit, keyed by
 *   each field's `metadata.ajaxParamName` (see
 *   {@link FormValidator.getAjaxParamList}); null if anything is invalid.
 * @property {GroupFieldResult[]} results Each field's result.
 */

/**
 * Validates field values and reports/collects errors. Create one per
 * form, so each keeps its own independent list of fields.
 *
 * @example
 * const formValidator = new FormValidator(FormBuilder.getInputContainers());
 * submitButton.addEventListener("click", () => {
 *     const { isValid, data } = formValidator.validate();
 *     if (isValid) {
 *         send(data);
 *     }
 * });
 */
export class FormValidator {

    static #DEFAULT_FIELD_TEMPLATE = "\"@#field#@\" @#message#@";

    // Every option validate()/validateFormGroupInputs() accept.
    static #VALIDATE_OPTION_KEYS = [
        "messages", "alertHeading",
        "displayAlert", "alertInstructions", "alertErrorTemplate", "alertHandler",
        "inputErrorMessage", "fullMessageTemplate"
    ];

    #inputContainers = [];

    // -------------------------------------------------------------
    // Construction and the field list
    // -------------------------------------------------------------

    /**
     * @param {import("./formElement.js").FormElement | import("./formElement.js").FormElementConfig
     *   | Array<import("./formElement.js").FormElement | import("./formElement.js").FormElementConfig> | null} [inputContainers]
     *   Fields to register straight away (see {@link FormValidator#register}).
     * @throws {Error} If more than one argument is given, or registering fails.
     */
    constructor(inputContainers = null) {
        if (arguments.length > 1) {
            throw new Error(`FormValidator: only accepts 1 parameter.`);
        }
        if (inputContainers !== null && inputContainers !== undefined) {
            this.register(inputContainers);
        }
        // The field list is private state, so freezing the instance only
        // stops properties being added or methods being shadowed.
        if (new.target === FormValidator) {
            Object.freeze(this);
        }
    }

    // Turns one register() entry into a FormElement: an existing
    // FormElement is used as-is; a plain config object is built into one
    // (FormElement's constructor does all the checking).
    static #toFormElement(inputConfig) {
        if (inputConfig instanceof FormElement) {
            return inputConfig;
        }
        if (Validation.isTypeOf({ value: inputConfig, type: Validation.types.plainObjectType })) {
            return new FormElement(inputConfig);
        }
        throw new Error(`FormValidator: each field must be a FormElement or a FormElement configuration object.`);
    }

    /**
     * Registers one field, or an array of them — each a FormElement or a
     * FormElement config object. All-or-nothing: if any entry is invalid
     * or already registered, none of them are added.
     * @param {import("./formElement.js").FormElement | import("./formElement.js").FormElementConfig
     *   | Array<import("./formElement.js").FormElement | import("./formElement.js").FormElementConfig>} inputConfig
     * @returns {import("./formElement.js").FormElement[]} The registered fields.
     * @throws {Error} If an entry isn't a FormElement or a valid config, or is already registered.
     */
    register(inputConfig) {
        const configs = Array.isArray(inputConfig) ? inputConfig : [inputConfig];
        const formElements = configs.map(config => FormValidator.#toFormElement(config));
        formElements.forEach((formElement, index) => {
            if (this.#inputContainers.includes(formElement) || formElements.indexOf(formElement) !== index) {
                throw new Error(`FormValidator: the field "${formElement.label ?? "(unlabeled)"}" is already registered.`);
            }
        });
        this.#inputContainers.push(...formElements);
        return formElements;
    }

    /**
     * Removes one registered field.
     * @param {import("./formElement.js").FormElement} formElement
     * @returns {boolean} True if it was registered.
     */
    unregister(formElement) {
        const index = this.#inputContainers.indexOf(formElement);
        if (index === -1) {
            return false;
        }
        this.#inputContainers.splice(index, 1);
        return true;
    }

    /**
     * Checks a single config object/FormElement without registering it
     * anywhere.
     * @param {import("./formElement.js").FormElement | import("./formElement.js").FormElementConfig} inputConfig
     * @returns {import("./formElement.js").FormElement} The FormElement (built from the config if needed).
     * @throws {Error} If it isn't a FormElement or a valid config.
     */
    static assertValidInput(inputConfig) {
        return FormValidator.#toFormElement(inputConfig);
    }

    /**
     * The registered fields, in order (a copy).
     * @returns {import("./formElement.js").FormElement[]}
     */
    getInputContainers() {
        return [...this.#inputContainers];
    }

    /**
     * Removes every registered field.
     * @returns {void}
     */
    clearInputContainers() {
        this.#inputContainers = [];
    }

    // -------------------------------------------------------------
    // One-call validate + retrieve
    // -------------------------------------------------------------

    /**
     * Validates every registered field, shows the results on the page,
     * and — if everything is valid — collects the values to submit, keyed
     * by each field's `metadata.ajaxParamName`. All in a single call.
     * @param {ValidateOptions} [options={}]
     * @returns {ValidateOutcome}
     * @throws {Error} If an option is invalid, or a customValidator
     *   throws or returns something other than an array of strings.
     */
    validate(options = {}) {
        if (!Validation.isTypeOf({ value: options, type: Validation.types.plainObjectType })) {
            throw new Error(`FormValidator: validate() options must be an object.`);
        }
        if (Object.hasOwn(options, "inputContainers")) {
            throw new Error(`FormValidator: validate() always checks the registered fields — use validateFormGroupInputs() to check others.`);
        }
        const results = this.validateFormGroupInputs({ ...options, inputContainers: this.#inputContainers });

        const isValid = results.every(result => result.isValid);
        const errors = results.flatMap(result => result.errors);
        const data = isValid ? FormValidator.getAjaxParamList(results) : null;

        return { isValid, errors, data, results };
    }

    // -------------------------------------------------------------
    // Reading a field's value
    // -------------------------------------------------------------

    // A plain decimal number, as typed: optional sign, digits with an
    // optional decimal point, optional exponent. Stricter than
    // parseFloat (which accepts "12abc" as 12) and Number (which accepts
    // "0x10" as 16 and "" as 0).
    static #NUMBER_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

    // The formats <input type="date"> and <input type="datetime-local">
    // produce.
    static #DATE_PATTERN = /^(\d{4,})-(\d{2})-(\d{2})$/;
    static #DATETIME_PATTERN = /^(\d{4,})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;

    // Parses a date/datetime-local value into a local-time Date, or null
    // if it isn't one. (new Date("2026-10-27") would be UTC midnight —
    // the previous day in the Americas.)
    // - The calendar is checked in UTC, where every day has 24 hours: parts
    //   such as 2026-02-30 or 25:00 are rejected rather than rolled over.
    //   Checking in local time instead wrongly rejected a time inside a
    //   daylight-saving gap (e.g. 02:30 on the spring-forward day), which
    //   the browser accepts — the local Date then lands just after the gap.
    // - setFullYear is used because the Date constructor reads years 0-99
    //   as 1900-1999.
    // - Fractional seconds are a decimal fraction: ".5" is 500 ms, not 5.
    static #parseDate(text) {
        const parts = FormValidator.#DATE_PATTERN.exec(text) ?? FormValidator.#DATETIME_PATTERN.exec(text);
        if (parts === null) {
            return null;
        }
        const [year, month, day, hours = 0, minutes = 0, seconds = 0] = parts.slice(1, 7).map(part => Number(part ?? 0));
        const fraction = parts[7];
        const milliseconds = fraction === undefined ? 0 : Number(fraction.padEnd(3, "0"));

        const calendar = new Date(0);
        calendar.setUTCFullYear(year, month - 1, day);
        calendar.setUTCHours(hours, minutes, seconds, milliseconds);
        const isRealDate = calendar.getUTCFullYear() === year && calendar.getUTCMonth() === month - 1 && calendar.getUTCDate() === day
            && calendar.getUTCHours() === hours && calendar.getUTCMinutes() === minutes && calendar.getUTCSeconds() === seconds;
        if (!isRealDate) {
            return null;
        }

        const date = new Date(0);
        date.setFullYear(year, month - 1, day);
        date.setHours(hours, minutes, seconds, milliseconds);
        return date;
    }

    // A value in the form it's compared in. A "date" field holds a calendar
    // day, so Dates are compared by day — a bound or option created with a
    // time of day (e.g. min: new Date(), meaning "today or later") would
    // otherwise reject that same day, which is read as midnight. Other
    // Dates are compared by their exact time.
    static #comparable(value, fieldType) {
        if (!Validation.isTypeOf({ value, type: Validation.types.dateType })) {
            return value;
        }
        if (fieldType === "date") {
            return value.getFullYear() * 10000 + (value.getMonth() + 1) * 100 + value.getDate();
        }
        return value.getTime();
    }

    // Field types whose text is kept exactly as typed: a password's
    // spaces are part of it, and a textarea's leading indentation and
    // trailing newlines are part of its content (e.g. code).
    static #UNTRIMMED_TYPES = ["password", "textarea"];

    // A field's current value, converted to its expectedType:
    // - boolean (checkbox): its checked state
    // - otherwise the text, trimmed (except for passwords and textareas,
    //   see #UNTRIMMED_TYPES); blank means "no value" (null)
    // - number: parsed from the text; date: parsed into a Date
    // Text that doesn't parse is returned as-is, so the type check
    // reports it.
    static #readValue(formElement) {
        const { input, validation } = formElement;
        if (validation.expectedType === Validation.types.booleanType) {
            return input.checked;
        }
        const rawText = input.value;
        const text = FormValidator.#UNTRIMMED_TYPES.includes(formElement.type) ? rawText : rawText.trim();
        if (text.trim() === "") {
            return null;
        }
        if (validation.expectedType === Validation.types.numberType) {
            return FormValidator.#NUMBER_PATTERN.test(text) ? Number(text) : text;
        }
        if (validation.expectedType === Validation.types.dateType) {
            return FormValidator.#parseDate(text) ?? text;
        }
        return text;
    }

    // Types the browser ignores a required attribute on (they always
    // have a value, or aren't validated).
    static #REQUIRED_ATTRIBUTE_IGNORED_TYPES = ["range", "color", "hidden"];

    // A minlength/maxlength attribute as a number, or null if it's missing
    // or not a valid non-negative integer (which the browser ignores).
    static #lengthAttribute(input, name) {
        const text = input.getAttribute(name);
        return text !== null && /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;
    }

    // What gets submitted for a value (see getAjaxParamList): the value,
    // except a date, which is submitted as the text the input shows
    // ("1990-12-10" / "1990-12-10T14:30"). A Date set to local midnight
    // turns into a UTC timestamp in JSON, which is the previous day for
    // anyone east of UTC.
    static #submitValueOf(value, input) {
        return Validation.isTypeOf({ value, type: Validation.types.dateType }) ? input.value.trim() : value;
    }

    // A bound (number, or Date) as text for an error message.
    static #describeBound(bound, fieldType) {
        if (!Validation.isTypeOf({ value: bound, type: Validation.types.dateType })) {
            return String(bound);
        }
        const pad = (number) => String(number).padStart(2, "0");
        const datePart = `${bound.getFullYear()}-${pad(bound.getMonth() + 1)}-${pad(bound.getDate())}`;
        return fieldType === "datetime-local" ? `${datePart} ${pad(bound.getHours())}:${pad(bound.getMinutes())}` : datePart;
    }

    // Fills @#name#@ placeholders in one pass, so a value that itself
    // contains a placeholder (e.g. a label of "@#message#@") is never
    // substituted a second time.
    static #fillTemplate(template, values) {
        return template.replace(/@#(\w+)#@/g, (placeholder, name) => Object.hasOwn(values, name) ? values[name] : placeholder);
    }

    // -------------------------------------------------------------
    // Validating one field
    // -------------------------------------------------------------

    // What the browser's own type checks (input.validity) say about a
    // field, beyond what its value alone shows:
    // - badInput: the user typed something the browser couldn't parse
    //   (e.g. "1e" in a number field) — input.value is then "", so
    //   without this it would look like an empty field
    // - typeMismatch: not a valid email address / URL
    // - stepMismatch: not a multiple of the step attribute
    // - rangeUnderflow/rangeOverflow: outside the min/max attributes —
    //   used for bounds FieldValidation doesn't hold (time/month/week
    //   fields, or hand-written markup with min/max attributes), so the
    //   same bound is never reported twice
    static #nativeProblems(input) {
        const validity = input.validity;
        return {
            badInput: validity?.badInput === true,
            typeMismatch: validity?.typeMismatch === true,
            stepMismatch: validity?.stepMismatch === true,
            rangeUnderflow: validity?.rangeUnderflow === true,
            rangeOverflow: validity?.rangeOverflow === true,
            patternMismatch: validity?.patternMismatch === true
        };
    }

    // The message for each rule. Any of them can be replaced (e.g. to
    // translate them) with the "messages" option; placeholders such as
    // @#minChars#@ are filled with the rule's value.
    static #DEFAULT_MESSAGES = Object.freeze({
        required: "is a required field",
        type: "does not match the expected type of \"@#expectedType#@\"",
        email: "is not a valid email address",
        url: "is not a valid URL",
        minChars: "does not meet the minimum length of \"@#minChars#@\"",
        maxChars: "exceeds the maximum length of \"@#maxChars#@\"",
        min: "does not meet the minimum value of \"@#min#@\"",
        max: "exceeds the maximum value of \"@#max#@\"",
        step: "does not match the allowed step of \"@#step#@\"",
        pattern: "does not match the required format",
        options: "must be one of the allowed options"
    });

    /**
     * A copy of the default rule messages — e.g. a starting point for a
     * translated "messages" option.
     * @returns {Required<ValidationMessages>}
     */
    static get defaultMessages() {
        return { ...FormValidator.#DEFAULT_MESSAGES };
    }

    // The default messages with any given overrides applied. Overrides
    // must be an object of known keys with string values.
    static #resolveMessages(messages) {
        if (messages === null) {
            return FormValidator.#DEFAULT_MESSAGES;
        }
        if (!Validation.isTypeOf({ value: messages, type: Validation.types.plainObjectType })) {
            throw new Error(`FormValidator: "messages", if provided, must be an object.`);
        }
        const knownKeys = Object.keys(FormValidator.#DEFAULT_MESSAGES);
        const unknownKeys = Object.keys(messages).filter(key => !knownKeys.includes(key));
        if (unknownKeys.length > 0) {
            throw new Error(`FormValidator: unknown message(s) ${unknownKeys.map(key => `"${key}"`).join(", ")}. Allowed: ${knownKeys.join(", ")}.`);
        }
        for (const [key, message] of Object.entries(messages)) {
            if (!Validation.isTypeOf({ value: message, type: Validation.types.stringType }) || message.trim() === "") {
                throw new Error(`FormValidator: the "${key}" message must be a non-empty string.`);
            }
        }
        return { ...FormValidator.#DEFAULT_MESSAGES, ...messages };
    }

    /**
     * Validates one field's current value against its FieldValidation,
     * any validation attributes in its markup, and the browser's own
     * checks (bad input, email/URL format, step, range). Doesn't change
     * the page.
     *
     * A disabled field — on its own or through a disabled <fieldset> — is
     * skipped, the same as a browser skips it: always valid, value null,
     * and `disabled` true (so it isn't submitted). A read-only or hidden
     * field is skipped too, but still submitted.
     *
     * @param {object} args
     * @param {import("./formElement.js").FormElement} args.inputContainer The field.
     * @param {string} [args.fieldErrorTemplate] Template for each error's
     *   fullMessage (default `"@#field#@" @#message#@`).
     * @param {ValidationMessages | null} [args.messages] Replacements for rule messages.
     * @returns {FieldResult}
     * @throws {Error} If an argument is invalid, or the customValidator
     *   throws or returns something other than an array of strings.
     */
    static validateSingleInput({
        inputContainer = null,
        fieldErrorTemplate = "\"@#field#@\" @#message#@",
        messages = null
    } = {}) {
        if (!(inputContainer instanceof FormElement)) {
            throw new Error(`FormValidator: "inputContainer" is required and must be a FormElement.`);
        }
        if (!Validation.isTypeOf({ value: fieldErrorTemplate, type: Validation.types.stringType })) {
            throw new Error(`FormValidator: "fieldErrorTemplate" must be a string.`);
        }
        const text = FormValidator.#resolveMessages(messages);
        // a rule message can also use @#field#@ (the field's label), e.g.
        // "The @#field#@ field is required" — filled here, since the outer
        // template is filled in a single pass and won't revisit it
        const message = (key, values = {}) => FormValidator.#fillTemplate(text[key], { field, ...values });

        const { input, validation } = inputContainer;
        if (input.matches(":disabled")) {
            return { isValid: true, errors: [], value: null, submitValue: null, disabled: true };
        }

        const fieldType = inputContainer.type;
        const field = inputContainer.label ?? "This field";
        const value = FormValidator.#readValue(inputContainer);

        // A field the browser leaves out of validation (willValidate is
        // false) — read-only, or hidden — is skipped the same way: it's
        // always valid and its rules aren't checked, since the user can't
        // change it to fix an error. Unlike a disabled field, it's still
        // submitted with its value.
        if (input.willValidate === false) {
            return { isValid: true, errors: [], value, submitValue: FormValidator.#submitValueOf(value, input), disabled: false };
        }

        const native = FormValidator.#nativeProblems(input);

        // The rules: the FieldValidation's, plus any validation attributes
        // in the markup for rules the FieldValidation doesn't set itself —
        // so hand-written <input required minlength="3"> is honored.
        // (FormElement already rejects an attribute that contradicts a
        // FieldValidation rule.) minlength/maxlength are read directly: the
        // browser only flags them after the user edits the field.
        const isRequired = validation.required
            || (input.required && !FormValidator.#REQUIRED_ATTRIBUTE_IGNORED_TYPES.includes(fieldType));
        const isText = validation.expectedType === Validation.types.stringType;
        const minChars = validation.minChars ?? (isText ? FormValidator.#lengthAttribute(input, "minlength") : null);
        const maxChars = validation.maxChars ?? (isText ? FormValidator.#lengthAttribute(input, "maxlength") : null);
        const errors = [];

        function addError(message) {
            errors.push({
                field,
                message,
                fullMessage: FormValidator.#fillTemplate(fieldErrorTemplate, { field, message })
            });
        }

        const isBoolean = validation.expectedType === Validation.types.booleanType;
        // the custom validator only runs when the basics are fine — not on
        // a wrong type, and not on top of a "required" error (which would
        // otherwise often report the same problem twice)
        let skipCustomValidator = false;

        if (isBoolean) {
            // A checkbox always has a value (checked or not), so for a
            // boolean, "required" means it must be checked — e.g. an
            // "I agree to the terms" box.
            if (isRequired && value !== true) {
                skipCustomValidator = true;
                addError(message("required"));
            }
        }
        else if (native.badInput || (value !== null && !Validation.isTypeOf({ value, type: validation.expectedType }))) {
            skipCustomValidator = true;
            addError(message("type", { expectedType: validation.expectedType }));
        }
        else if (value === null) {
            if (isRequired) {
                skipCustomValidator = true;
                addError(message("required"));
            }
        }
        else {
            if (native.typeMismatch) {
                addError(fieldType === "email" || fieldType === "url" ? message(fieldType) : message("type", { expectedType: validation.expectedType }));
            }
            // Every check uses an explicit null test, so a rule of 0 (or a
            // value of 0) is still checked.
            const { min, max } = validation;
            if (minChars !== null && value.length < minChars) {
                addError(message("minChars", { minChars: String(minChars) }));
            }
            if (maxChars !== null && value.length > maxChars) {
                addError(message("maxChars", { maxChars: String(maxChars) }));
            }
            const comparableValue = FormValidator.#comparable(value, fieldType);
            if (min !== null && comparableValue < FormValidator.#comparable(min, fieldType)) {
                addError(message("min", { min: FormValidator.#describeBound(min, fieldType) }));
            }
            if (max !== null && comparableValue > FormValidator.#comparable(max, fieldType)) {
                addError(message("max", { max: FormValidator.#describeBound(max, fieldType) }));
            }
            // time/month/week values and their min/max attributes are checked
            // in code (see fieldFormats.js), not by the browser: a browser
            // that doesn't implement the type (Firefox shows a plain text
            // box for month/week) accepts any text and has no range check.
            let hasFormatError = false;
            if (isTextFormatType(fieldType)) {
                const key = parseTextFormat(fieldType, value);
                if (key === null) {
                    hasFormatError = true;
                    addError(message("pattern"));
                } else {
                    const minText = input.getAttribute("min");
                    const maxText = input.getAttribute("max");
                    const minKey = parseTextFormat(fieldType, minText);
                    const maxKey = parseTextFormat(fieldType, maxText);
                    // a time range with min after max wraps past midnight
                    // (e.g. 22:00-06:00): only the gap between them is out
                    const isOvernight = fieldType === "time" && minKey !== null && maxKey !== null && minKey > maxKey;
                    if (isOvernight) {
                        if (key < minKey && key > maxKey) {
                            addError(message("min", { min: minText }));
                        }
                    } else {
                        if (minKey !== null && key < minKey) {
                            addError(message("min", { min: minText }));
                        }
                        if (maxKey !== null && key > maxKey) {
                            addError(message("max", { max: maxText }));
                        }
                    }
                }
            } else {
                if (min === null && native.rangeUnderflow) {
                    addError(message("min", { min: input.getAttribute("min") }));
                }
                if (max === null && native.rangeOverflow) {
                    addError(message("max", { max: input.getAttribute("max") }));
                }
            }
            // With no step attribute, the HTML default step is 1 (a whole
            // number, or one day/second for date and time inputs) — so a
            // plain number field rejects decimals unless it's given a step
            // such as 0.01 or "any", the same as the browser does.
            if (native.stepMismatch) {
                addError(message("step", { step: input.getAttribute("step") ?? "1" }));
            }
            if (!hasFormatError && (!validation.matchesPattern(value) || (validation.pattern === null && native.patternMismatch))) {
                addError(message("pattern"));
            }
            const isAllowed = Validation.isTypeOf({ value, type: Validation.types.dateType })
                ? validation.options === null || validation.options.some(option => FormValidator.#comparable(option, fieldType) === comparableValue)
                : validation.isAllowedOption(value);
            if (!isAllowed) {
                addError(message("options"));
            }
        }

        // The custom validator gets the converted value (or null for an
        // optional blank field). It must return an array of error message
        // strings; anything it throws (including calling a class, which
        // can't be detected up front when it's been bound) is reported with
        // the field's name.
        const { customValidator } = validation;
        if (customValidator !== null && !skipCustomValidator) {
            let customErrors;
            try {
                customErrors = customValidator(value, inputContainer);
            } catch (error) {
                throw new Error(`FormValidator: the customValidator for "${field}" threw an error.`, { cause: error });
            }
            if (!Array.isArray(customErrors) || !customErrors.every(message => typeof message === "string")) {
                throw new Error(`FormValidator: the customValidator for "${field}" must return an array of error message strings.`);
            }
            customErrors.forEach(message => addError(message));
        }

        return { isValid: errors.length === 0, errors, value, submitValue: FormValidator.#submitValueOf(value, input), disabled: false };
    }

    // -------------------------------------------------------------
    // Validating a group of fields
    // -------------------------------------------------------------

    // The class an invalid field's label gets. Deliberately not the
    // "errorMessage" class the error container uses, so styling for the
    // error text (small, red) doesn't also restyle the label.
    static #ERROR_LABEL_CLASS = "errorLabel";

    // Shows one field's result on the page: toggles the "errorLabel"
    // class on its label and aria-invalid on its input, and puts one line
    // per error in its errorMessageContainer. Messages are inserted as
    // text, never as HTML — a customValidator message (or a label) can
    // contain whatever the user typed. The container is only touched when
    // its messages actually change: it's announced to screen readers on
    // every change, so rebuilding it each time would re-read unchanged
    // errors on every validation.
    static #showResult(formElement, result, inputErrorMessage) {
        formElement.labelElement?.classList.toggle(FormValidator.#ERROR_LABEL_CLASS, !result.isValid);
        if (result.isValid) {
            formElement.input.removeAttribute("aria-invalid");
        } else {
            formElement.input.setAttribute("aria-invalid", "true");
        }
        const container = formElement.errorMessageContainer;
        if (container) {
            const lines = result.errors.map(error => FormValidator.#fillTemplate(inputErrorMessage, error));
            const currentLines = [...container.children].map(line => line.textContent);
            const isUnchanged = container.childNodes.length === container.children.length
                && currentLines.length === lines.length
                && currentLines.every((text, index) => text === lines[index]);
            if (!isUnchanged) {
                container.replaceChildren(...lines.map(text => {
                    const line = container.ownerDocument.createElement("div");
                    line.textContent = text;
                    return line;
                }));
            }
        }
    }

    // The function that shows the alert: the one passed in, else a global
    // $PCCDB.alert if the page has one.
    static #resolveAlertHandler(alertHandler) {
        if (alertHandler !== null) {
            return alertHandler;
        }
        const globalAlert = globalThis.$PCCDB?.alert;
        if (typeof globalAlert === "function") {
            return (options) => globalAlert.call(globalThis.$PCCDB, options);
        }
        throw new Error(`FormValidator: "displayAlert" needs an "alertHandler" function (or a global $PCCDB.alert).`);
    }

    /**
     * Validates a group of fields — the registered ones by default, or the
     * FormElement / array of FormElements given as `inputContainers` — and
     * shows each result on the page: the "errorLabel" class on the label,
     * aria-invalid on the input, and one line per error in the error
     * container (as text, never HTML). Every field is validated before
     * anything is shown, so a failure doesn't leave the page half-updated.
     * @param {GroupValidateOptions} [options={}]
     * @returns {GroupFieldResult[]} One result per field, in order.
     * @throws {Error} If an option is invalid, `displayAlert` is on with no
     *   alert handler available, or a customValidator throws or returns
     *   something other than an array of strings.
     */
    validateFormGroupInputs(options = {}) {
        if (!Validation.isTypeOf({ value: options, type: Validation.types.plainObjectType })) {
            throw new Error(`FormValidator: validateFormGroupInputs() options must be an object.`);
        }
        const allowedKeys = ["inputContainers", ...FormValidator.#VALIDATE_OPTION_KEYS];
        const unknownKeys = Object.keys(options).filter(key => !allowedKeys.includes(key));
        if (unknownKeys.length > 0) {
            throw new Error(`FormValidator: unknown option(s) ${unknownKeys.map(key => `"${key}"`).join(", ")}. Allowed: ${allowedKeys.join(", ")}.`);
        }

        const {
            inputContainers = null,
            displayAlert = false,
            alertInstructions = null,
            alertErrorTemplate = "@#fullMessage#@",
            alertHandler = null,
            alertHeading = "Error...",
            messages = null,
            inputErrorMessage = "@#fullMessage#@",
            fullMessageTemplate = FormValidator.#DEFAULT_FIELD_TEMPLATE
        } = options;

        // check the options
        if (!Validation.isTypeOf({ value: displayAlert, type: Validation.types.booleanType })) {
            throw new Error(`FormValidator: "displayAlert" must be a boolean.`);
        }
        for (const [name, value] of [["alertErrorTemplate", alertErrorTemplate], ["inputErrorMessage", inputErrorMessage], ["fullMessageTemplate", fullMessageTemplate]]) {
            if (!Validation.isTypeOf({ value, type: Validation.types.stringType })) {
                throw new Error(`FormValidator: "${name}" must be a string.`);
            }
        }
        if (alertInstructions !== null && !Validation.isTypeOf({ value: alertInstructions, type: Validation.types.stringType })) {
            throw new Error(`FormValidator: "alertInstructions", if provided, must be a string.`);
        }
        if (alertHandler !== null && !Validation.isTypeOf({ value: alertHandler, type: Validation.types.functionType })) {
            throw new Error(`FormValidator: "alertHandler", if provided, must be a function.`);
        }
        if (!Validation.isTypeOf({ value: alertHeading, type: Validation.types.stringType }) || alertHeading.trim() === "") {
            throw new Error(`FormValidator: "alertHeading" must be a non-empty string.`);
        }
        // checked up front, so a bad override fails even when every field is valid
        FormValidator.#resolveMessages(messages);
        const showAlert = displayAlert ? FormValidator.#resolveAlertHandler(alertHandler) : null;

        // which fields: the registered ones, one FormElement, or an array of them
        const formElements = inputContainers === null ? this.#inputContainers
            : inputContainers instanceof FormElement ? [inputContainers]
                : inputContainers;
        if (!Array.isArray(formElements) || !formElements.every(formElement => formElement instanceof FormElement)) {
            throw new Error(`FormValidator: "inputContainers" must be a FormElement or an array of FormElements.`);
        }

        // Every field is validated first, and only then is anything shown:
        // if one field throws (e.g. its input's type was changed), the page
        // isn't left with some fields updated and others not.
        const results = formElements.map(formElement => ({
            ...FormValidator.validateSingleInput({ inputContainer: formElement, fieldErrorTemplate: fullMessageTemplate, messages }),
            metadata: formElement.metadata
        }));
        formElements.forEach((formElement, index) => FormValidator.#showResult(formElement, results[index], inputErrorMessage));

        if (showAlert !== null) {
            const errorLines = results.flatMap(result =>
                result.errors.map(error => FormValidator.#fillTemplate(alertErrorTemplate, error)));
            if (errorLines.length > 0) {
                const alertContainer = document.createElement("div");
                if (alertInstructions !== null) {
                    const instructions = document.createElement("div");
                    instructions.textContent = alertInstructions;
                    alertContainer.append(instructions);
                }
                errorLines.forEach(text => {
                    const line = document.createElement("div");
                    line.textContent = text;
                    alertContainer.append(line);
                });
                showAlert({ heading: alertHeading, element: alertContainer });
            }
        }

        return results;
    }

    // -------------------------------------------------------------
    // Collecting submit data
    // -------------------------------------------------------------

    /**
     * Turns validation results into the values to submit:
     * `{ [ajaxParamName]: submitValue }` for every field whose metadata has
     * an ajaxParamName (dates as their local text). Fields without one
     * aren't submitted, and neither are disabled fields (same as an HTML
     * form).
     * @param {Array<FieldResult & { metadata?: object | null }>} validatedResponse
     *   The results from {@link FormValidator#validateFormGroupInputs}.
     * @returns {Record<string, *>}
     * @throws {Error} If any field is invalid, or two fields use the same
     *   ajaxParamName (one would silently overwrite the other).
     */
    static getAjaxParamList(validatedResponse) {
        if (!Array.isArray(validatedResponse)) {
            throw new Error(`FormValidator: getAjaxParamList() needs the array of results from validateFormGroupInputs().`);
        }
        if (!validatedResponse.every(result => result?.isValid === true)) {
            throw new Error(`FormValidator: not all fields are valid.`);
        }

        const entries = [];
        for (const result of validatedResponse) {
            const name = result.metadata?.ajaxParamName;
            if (name === undefined || name === null || result.disabled === true) {
                continue;
            }
            if (!Validation.isTypeOf({ value: name, type: Validation.types.stringType }) || name.trim() === "") {
                throw new Error(`FormValidator: "metadata.ajaxParamName" must be a non-empty string.`);
            }
            if (entries.some(([existingName]) => existingName === name)) {
                throw new Error(`FormValidator: more than one field uses the ajaxParamName "${name}".`);
            }
            entries.push([name, Object.hasOwn(result, "submitValue") ? result.submitValue : result.value]);
        }
        // fromEntries creates real own properties, so even a name like
        // "__proto__" is stored as data rather than changing the prototype
        return Object.fromEntries(entries);
    }

    // Freeze the class and its prototype, same as the other classes.
    // Must stay the last static element.
    static {
        Object.freeze(FormValidator.prototype);
        Object.freeze(FormValidator);
    }
}
