import { Validation } from "./validation.js";
import { FieldValidation } from "./fieldValidation.js";

/**
 * The field types a FormElement can be: a textarea, a single select, or
 * an <input> type that holds a single user-entered value.
 * @typedef {"textarea" | "select" | "text" | "password" | "email" | "number"
 *   | "tel" | "url" | "search" | "date" | "datetime-local" | "month" | "week"
 *   | "time" | "color" | "checkbox" | "range" | "hidden"} FieldType
 */

/**
 * The pieces of a FormElement. Only `input` is required; unknown keys
 * throw. Elements may come from any document (e.g. an iframe).
 * @typedef {object} FormElementConfig
 * @property {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} input
 *   The field itself (not a <select multiple>).
 * @property {string | null} [label] The field's name in messages. If
 *   omitted, it's read live from the label element, aria-labelledby,
 *   aria-label, name, or id.
 * @property {HTMLElement | null} [labelElement] The field's label. If
 *   omitted, found from the page (input.labels, a wrapping <label>, or
 *   <label for>).
 * @property {HTMLElement | null} [errorMessageContainer] Where FormValidator
 *   shows the field's errors. Must not be or contain the input or label.
 * @property {HTMLElement | null} [container] A wrapper that contains the input.
 * @property {FieldType | null} [type] The field type; detected from the
 *   element if omitted, and must match it if given.
 * @property {import("./fieldValidation.js").FieldValidation | null} [validation]
 *   The field's rules. Defaults to rules suited to the type (boolean for a
 *   checkbox, number for number/range, date for date inputs, else string).
 * @property {Record<string | symbol, *> | null} [metadata] Any extra data
 *   (e.g. `{ ajaxParamName: "email" }`, the key the value is submitted
 *   under). Stored as a deep, frozen copy.
 */

/**
 * A single form field: the DOM pieces that make it up, plus its
 * validation rules (a {@link FieldValidation}) and metadata. Validated at
 * construction — invalid data can't exist as a FormElement at all, so
 * anything holding one doesn't need to re-check it. Instances are
 * immutable.
 *
 * Both FormBuilder (built fields) and hand-written markup produce these,
 * so there's exactly one shape moving through the whole system.
 *
 * @example
 * const email = new FormElement({
 *     input: document.getElementById("email"),
 *     errorMessageContainer: document.getElementById("emailError"),
 *     validation: new FieldValidation({ required: true }),
 *     metadata: { ajaxParamName: "email" }
 * });
 */
export class FormElement {

    // -------------------------------------------------------------
    // Shared validation tables/helpers
    // -------------------------------------------------------------

    // Valid values for "type" — either one of the two non-<input> field
    // kinds FormBuilder builds, or an HTML <input> type that holds a
    // user-entered value. (button/submit/reset/image inputs are controls,
    // not fields — they have nothing to validate. A radio isn't either:
    // its value is the same whether or not it's checked, so it only means
    // something as a group, which a single FormElement can't represent.
    // Nor is a file input: its value is a list of files, and input.value
    // is only a fake "C:\fakepath\…" string.)
    static #VALID_TYPES = [
        "textarea", "select",
        "text", "password", "email", "number", "tel", "url", "search",
        "date", "datetime-local", "month", "week", "time",
        "color", "checkbox", "range",
        "hidden"
    ];

    // Inputs "required" could never fail on: a range always has a value
    // (its midpoint), a color too (#000000), and a hidden input is left
    // out of validation altogether (by the browser, and by FormValidator).
    static #REQUIRED_NOT_ALLOWED_TYPES = {
        "range": "it always has a value",
        "color": "it always has a value",
        "hidden": "hidden inputs aren't validated"
    };

    // Which validation.expectedType values make sense for each field type
    // (first entry = the default when no validation is given). A
    // checkbox's value is its checked state, so it's always a boolean —
    // and a boolean can only come from a checkbox. number/range inputs
    // only ever produce numbers. "date" only makes sense for the
    // date-picking inputs. Free-form text fields (text, search, hidden,
    // select) can hold text or a number. Everything else — email, url,
    // tel, password, color, month, week, time, textarea — only
    // ever holds text in a format a number can't represent (a phone
    // number as a number would even lose its leading zeros).
    static #EXPECTED_TYPES_BY_FIELD_TYPE = {
        "checkbox": [Validation.types.booleanType],
        "number": [Validation.types.numberType],
        "range": [Validation.types.numberType],
        "date": [Validation.types.dateType, Validation.types.stringType],
        "datetime-local": [Validation.types.dateType, Validation.types.stringType],
        "text": [Validation.types.stringType, Validation.types.numberType],
        "search": [Validation.types.stringType, Validation.types.numberType],
        "hidden": [Validation.types.stringType, Validation.types.numberType],
        "select": [Validation.types.stringType, Validation.types.numberType]
    };
    static #DEFAULT_EXPECTED_TYPES = [Validation.types.stringType];

    // Every key a config may contain — anything else is rejected, same as
    // FieldValidation does.
    static #ALLOWED_KEYS = [
        "input", "label", "labelElement", "errorMessageContainer",
        "container", "type", "validation", "metadata"
    ];

    // The only elements that can actually hold a field's value.
    static #FIELD_TAG_NAMES = ["INPUT", "SELECT", "TEXTAREA"];

    // The DOM's own nodeType getter. Calling it on something that isn't a
    // real node throws ("Illegal invocation"), so it doubles as a brand
    // check — and unlike `instanceof Element`, it works for nodes from any
    // window, including an iframe that has since been removed.
    static #NODE_TYPE_GETTER = typeof Node !== "undefined"
        ? Object.getOwnPropertyDescriptor(Node.prototype, "nodeType").get
        : null;

    // The getters, locked onto every instance (see the end of the
    // constructor).
    static #GETTER_NAMES = [
        "input", "label", "labelElement", "errorMessageContainer",
        "container", "type", "validation", "metadata"
    ];

    // True only for a real element — Validation's jsElementType also
    // accepts text/comment nodes, documents, fragments, and any object
    // with a numeric .nodeType (e.g. a hand-written `{ nodeType: 1 }`),
    // none of which can be a field or hold a label/error message.
    static #isElementNode(value) {
        if (value === null || typeof value !== "object" || FormElement.#NODE_TYPE_GETTER === null) {
            return false;
        }
        try {
            return FormElement.#NODE_TYPE_GETTER.call(value) === 1; // Node.ELEMENT_NODE
        } catch {
            return false;
        }
    }

    // Every <input> type the HTML spec defines.
    static #HTML_INPUT_TYPES = [
        "text", "search", "tel", "url", "email", "password",
        "date", "month", "week", "time", "datetime-local",
        "number", "range", "color", "checkbox", "radio", "file",
        "submit", "image", "reset", "button", "hidden"
    ];

    // Comparable forms of a pattern rule and a pattern attribute (see the
    // attribute check in the constructor). A rule is its RegExp source,
    // tagged with its flags if they're ones an attribute can't carry (so
    // /abc/i never equals an "abc" attribute). An attribute is compiled
    // the same way a string pattern is, so its source escapes "/" the same
    // way; one that doesn't compile is ignored by the browser (null).
    static #patternRuleKey(pattern) {
        if (pattern === null) {
            return null;
        }
        return ["", "u", "v"].includes(pattern.flags) ? pattern.source : `${pattern.source}/${pattern.flags}`;
    }

    static #patternAttributeKey(text) {
        try {
            return new RegExp(text).source;
        } catch {
            return null;
        }
    }

    // A minlength/maxlength attribute as a number, or null if the browser
    // would ignore it (not a non-negative integer).
    static #lengthAttributeValue(text) {
        return /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;
    }

    // The field type an element is declared as right now. For an <input>
    // this reads the type *attribute*, normalized the way the HTML spec
    // does it (case-insensitive; missing or unknown means "text"), rather
    // than input.type — a browser that doesn't implement a type reports
    // "text" from .type (e.g. Firefox for "month"/"week"), which would make
    // the same markup get different validation rules in different browsers.
    static #detectType(input) {
        if (input.tagName === "TEXTAREA") {
            return "textarea";
        }
        if (input.tagName === "SELECT") {
            return "select";
        }
        const declaredType = (input.getAttribute("type") ?? "").toLowerCase();
        return FormElement.#HTML_INPUT_TYPES.includes(declaredType) ? declaredType : "text";
    }

    // A label's visible text, minus any form controls inside it — a
    // <label> wrapping a <select> would otherwise include every option's
    // text (and one wrapping a <textarea>, its default value).
    static #labelText(labelElement) {
        if (!labelElement) {
            return null;
        }
        const copy = labelElement.cloneNode(true);
        copy.querySelectorAll("input, select, textarea, button").forEach(control => control.remove());
        return copy.textContent;
    }

    // Deep copy of plain objects/arrays (keeping a plain object's
    // prototype, so Object.create(null) stays prototype-less), then
    // frozen all the way down — so neither the caller's original nor
    // anything returned from the getter can change it later. Dates are
    // copied, so the caller's Date is disconnected (freezing doesn't stop
    // a Date's set* methods, though). Anything else (functions, elements,
    // class instances) is kept by reference, since it can't be
    // meaningfully copied.
    //
    // `copies` maps each original object to its copy, so an object that
    // refers to itself (directly or further down) is copied once instead
    // of recursing forever, and two keys sharing one object still share
    // one (copied) object afterward. Symbol keys are copied too, not just
    // string keys.
    static #deepFreezeCopy(value, copies = new Map()) {
        if (copies.has(value)) {
            return copies.get(value);
        }
        if (Array.isArray(value)) {
            const copy = [];
            copies.set(value, copy);
            value.forEach((item, index) => { copy[index] = FormElement.#deepFreezeCopy(item, copies); });
            return Object.freeze(copy);
        }
        if (Validation.isTypeOf({ value, type: Validation.types.dateType })) {
            const copy = Object.freeze(new Date(Date.prototype.getTime.call(value)));
            copies.set(value, copy);
            return copy;
        }
        if (Validation.isTypeOf({ value, type: Validation.types.plainObjectType })) {
            const copy = Object.create(Object.getPrototypeOf(value));
            copies.set(value, copy);
            for (const key of Reflect.ownKeys(value)) {
                if (Object.prototype.propertyIsEnumerable.call(value, key)) {
                    copy[key] = FormElement.#deepFreezeCopy(value[key], copies);
                }
            }
            return Object.freeze(copy);
        }
        return value;
    }

    // The elements an aria-labelledby attribute points to (a
    // space-separated list of ids), looked up in the input's own tree so
    // it also works before the field is attached to the page.
    static #ariaLabelledByElements(input) {
        const ids = (input.getAttribute?.("aria-labelledby") ?? "").split(/\s+/).filter(Boolean);
        const root = input.getRootNode();
        return ids
            .map(id => root.querySelector?.(`#${CSS.escape(id)}`))
            .filter(Boolean);
    }

    // Their combined text, or null if there are none.
    static #ariaLabelledByText(input) {
        const elements = FormElement.#ariaLabelledByElements(input);
        return elements.length === 0 ? null : elements.map(element => FormElement.#labelText(element)).join(" ");
    }

    // Returns the trimmed string, or null if it's missing or blank — used
    // so the label fallback chain skips "" and "   " instead of stopping
    // at them (an <input> with no name has name === "", not null).
    static #nonBlank(value) {
        if (!Validation.isTypeOf({ value, type: Validation.types.stringType })) {
            return null;
        }
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
    }

    // -------------------------------------------------------------
    // Private, read-only-from-outside state
    // -------------------------------------------------------------

    #input;
    #explicitLabel;
    #labelElement;
    #errorMessageContainer;
    #container;
    #type;
    #validation;
    #metadata;

    // -------------------------------------------------------------
    // Construction — this IS the validation. If the constructor
    // returns, the instance is guaranteed valid; there's no separate
    // "assert" step to remember to call.
    // -------------------------------------------------------------

    /**
     * @param {FormElementConfig} config The field's pieces.
     * @throws {Error} If the config or any piece is invalid, or the pieces
     *   don't fit together (e.g. a type that doesn't match the element, a
     *   container that doesn't contain the input, validation rules that
     *   don't suit the field type, or a validation attribute in the markup
     *   that contradicts a rule).
     */
    constructor(config) {
        // ensure that only 1 param is sent
        if(arguments.length !== 1) {
            throw new Error(`FormElement: only accepts 1 parameter.`);
        }

        // ensure that the param sent is an object. This has to happen
        // before destructuring — destructuring null/undefined in the
        // parameter list would throw a raw TypeError before this check
        // ever ran.
        if (!Validation.isTypeOf({ value: config, type: Validation.types.objectType }) || Array.isArray(config)) {
            throw new Error(`FormElement: only accepts a configuration object.`);
        }

        // Read the config exactly once, into a plain snapshot that every
        // check below uses (same reason as FieldValidation: a throwing
        // getter or a Proxy that changes its answers).
        let snapshot;
        try {
            snapshot = Object.assign({}, config);
        } catch (error) {
            throw new Error(`FormElement: the configuration object could not be read.`, { cause: error });
        }

        // reject unknown keys rather than silently dropping them. A
        // FieldValidation rule (e.g. "required") passed here directly is
        // the most likely mistake, so that gets a pointed hint.
        const unknownKeys = Object.keys(snapshot).filter(key => !FormElement.#ALLOWED_KEYS.includes(key));
        if (unknownKeys.length > 0) {
            const validationKeys = ["required", "expectedType", "minChars", "maxChars", "min", "max", "pattern", "customValidator", "options"];
            const hint = unknownKeys.some(key => validationKeys.includes(key))
                ? ` Validation rules go in a FieldValidation: { validation: new FieldValidation({ ... }) }.`
                : "";
            throw new Error(`FormElement: unknown option(s) ${unknownKeys.map(key => `"${key}"`).join(", ")}. Allowed: ${FormElement.#ALLOWED_KEYS.join(", ")}.${hint}`);
        }

        const {
            input = null,
            label = null,
            labelElement = null,
            errorMessageContainer = null,
            container = null,
            type = null,
            validation = null,
            metadata = null
        } = snapshot;

        // input — required, must be an <input>, <select>, or <textarea>
        if (!FormElement.#isElementNode(input)) {
            throw new Error(`FormElement: "input" is required and must be an HTMLElement.`);
        }
        if (!FormElement.#FIELD_TAG_NAMES.includes(input.tagName)) {
            throw new Error(`FormElement: "input" must be an <input>, <select>, or <textarea> element.`);
        }
        // a multi-select holds several values at once, which a single
        // field value can't represent
        if (input.tagName === "SELECT" && input.multiple) {
            throw new Error(`FormElement: "input" must not be a <select multiple> — only single-value fields are supported.`);
        }

        // labelElement — optional, but if present must be a DOM element.
        // If omitted, find the input's label: the browser's own
        // association (input.labels) when the field is on the page, else
        // a wrapping <label> (unless its "for" points at a different
        // field — then it labels that one, not this), else a
        // <label for="id"> anywhere in the same tree — which also covers a
        // field that isn't attached to the page yet. The id is CSS-escaped
        // so ids like "a'b" can't break the selector.
        if (labelElement !== null && labelElement !== undefined) {
            if (!FormElement.#isElementNode(labelElement)) {
                throw new Error(`FormElement: "labelElement", if provided, must be an HTMLElement.`);
            }
            // FormValidator styles the label element as an error, so it
            // must be the label, not the field (or a wrapper around it —
            // only a real <label> may wrap its input)
            if (labelElement === input) {
                throw new Error(`FormElement: "labelElement" must not be the input itself.`);
            }
            if (labelElement.tagName !== "LABEL" && labelElement.contains(input)) {
                throw new Error(`FormElement: "labelElement" must not contain the input (only a <label> element may wrap its input).`);
            }
        }
        const wrappingLabel = input.closest("label");
        const resolvedLabelElement = labelElement
            ?? input.labels?.[0]
            ?? (wrappingLabel && (!wrappingLabel.htmlFor || wrappingLabel.htmlFor === input.id) ? wrappingLabel : null)
            ?? (input.id ? input.getRootNode().querySelector?.(`label[for="${CSS.escape(input.id)}"]`) : null)
            ?? null;

        // errorMessageContainer — optional, but if present must be a DOM
        // element of its own. FormValidator replaces its contents on
        // every validation, so it must not be (or contain) the input or
        // the label — that would wipe the field or its label text.
        if (errorMessageContainer !== null && errorMessageContainer !== undefined) {
            if (!FormElement.#isElementNode(errorMessageContainer)) {
                throw new Error(`FormElement: "errorMessageContainer", if provided, must be an HTMLElement.`);
            }
            if (errorMessageContainer.contains(input)) {
                throw new Error(`FormElement: "errorMessageContainer" must not be or contain the input — its contents are replaced with error messages.`);
            }
            if (resolvedLabelElement && errorMessageContainer.contains(resolvedLabelElement)) {
                throw new Error(`FormElement: "errorMessageContainer" must not be or contain the label element — its contents are replaced with error messages.`);
            }
            if (FormElement.#ariaLabelledByElements(input).some(element => errorMessageContainer.contains(element))) {
                throw new Error(`FormElement: "errorMessageContainer" must not be or contain an element the input's aria-labelledby points to — its contents are replaced with error messages.`);
            }
        }

        // container — optional layout wrapper, but if present must be a DOM
        // element that actually wraps the input
        if (container !== null && container !== undefined) {
            if (!FormElement.#isElementNode(container)) {
                throw new Error(`FormElement: "container", if provided, must be an HTMLElement.`);
            }
            if (container === input || !container.contains(input)) {
                throw new Error(`FormElement: "container", if provided, must contain the input.`);
            }
        }

        // label — optional, but if present must be a non-blank string
        // (stored trimmed, same as the fallbacks). If omitted, fall back to
        // the label element's text, then aria-labelledby/aria-label/name/id
        // — skipping any that are empty or blank.
        // The fallback is worked out live, on every read of `label` (see
        // the getter), so a label whose text changes later is reflected.
        if (label !== null && label !== undefined && FormElement.#nonBlank(label) === null) {
            throw new Error(`FormElement: "label", if provided, must be a non-empty string.`);
        }
        const explicitLabel = FormElement.#nonBlank(label);

        // type — required, must be a recognized field type. Auto-detected
        // from the input element itself; if given explicitly, it must
        // agree with the element (a text <input> can't be a "checkbox" —
        // its value would be read from .checked, which it doesn't use).
        const detectedType = FormElement.#detectType(input);
        const resolvedType = type ?? detectedType;
        if (!Validation.isTypeOf({ value: resolvedType, type: Validation.types.stringType }) || !FormElement.#VALID_TYPES.includes(resolvedType)) {
            throw new Error(`FormElement: "type" is required and must be one of: ${FormElement.#VALID_TYPES.join(", ")}.`);
        }
        if (resolvedType !== detectedType) {
            throw new Error(`FormElement: "type" ("${resolvedType}") does not match the input element, which is "${detectedType}".`);
        }

        // validation — optional, but if provided it MUST already be a
        // FieldValidation instance. Unlike the other fields here, this one
        // is never built for you from a plain object — construct a
        // FieldValidation yourself (`new FieldValidation({...})`) and pass
        // that in. Omit it entirely to get a default FieldValidation whose
        // expectedType suits the field (boolean for a checkbox, number for
        // number/range, string for everything else).
        if (validation !== null && validation !== undefined && !(validation instanceof FieldValidation)) {
            throw new Error(`FormElement: "validation", if provided, must be a FieldValidation instance.`);
        }
        const allowedExpectedTypes = FormElement.#EXPECTED_TYPES_BY_FIELD_TYPE[resolvedType] ?? FormElement.#DEFAULT_EXPECTED_TYPES;
        const resolvedValidation = validation ?? new FieldValidation({ expectedType: allowedExpectedTypes[0] });

        // the field type and validation.expectedType must agree — e.g. a
        // checkbox can only be validated as a boolean, a number input
        // only as a number
        if (!allowedExpectedTypes.includes(resolvedValidation.expectedType)) {
            throw new Error(`FormElement: a "${resolvedType}" input only allows "validation.expectedType" of: ${allowedExpectedTypes.join(", ")} (got "${resolvedValidation.expectedType}").`);
        }

        // Date options must fall within min/max, compared the way this
        // field compares them (FieldValidation leaves this to here, since
        // it doesn't know the field type): a "date" input by calendar day —
        // so min: new Date() ("today or later") still allows an option of
        // today at midnight — a "datetime-local" input by exact time.
        if (resolvedValidation.expectedType === Validation.types.dateType && resolvedValidation.options !== null) {
            const isDayField = resolvedType === "date";
            const pad = (number, length = 2) => String(number).padStart(length, "0");
            const comparable = (date) => isDayField
                ? date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
                : date.getTime();
            const describe = (date) => {
                const day = `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
                return isDayField ? day : `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
            };
            const { min, max, options } = resolvedValidation;

            // On a date input, two options on the same calendar day (e.g.
            // 9:00 and 15:00) are the same value — FieldValidation only
            // catches exact-time duplicates, since it doesn't know the
            // field compares by day.
            if (isDayField) {
                const seenDays = new Set();
                const duplicates = options.filter(option => {
                    const day = comparable(option);
                    const isDuplicate = seenDays.has(day);
                    seenDays.add(day);
                    return isDuplicate;
                });
                if (duplicates.length > 0) {
                    throw new Error(`FormElement: "validation.options" has more than one value on the same day for a "date" input: ${duplicates.map(describe).join(", ")}.`);
                }
            }

            const boundChecks = [
                ["min", min, (option) => comparable(option) >= comparable(min)],
                ["max", max, (option) => comparable(option) <= comparable(max)]
            ];
            for (const [ruleName, bound, passes] of boundChecks) {
                if (bound === null) {
                    continue;
                }
                const failing = options.filter(option => !passes(option));
                if (failing.length > 0) {
                    throw new Error(`FormElement: "validation.options" contains value(s) that "validation.${ruleName}" would always reject on a "${resolvedType}" input: ${failing.map(describe).join(", ")}.`);
                }
            }
        }

        // A validation attribute in the markup (pattern, minlength,
        // maxlength) and a FieldValidation rule for the same thing must
        // agree — otherwise the browser's own UI and FormValidator would
        // enforce different rules. (Where only the attribute is set,
        // FormValidator uses it.)
        //
        // Values are compared by meaning, not as raw text: lengths as
        // numbers ("03" and " 3 " are both 3), and a pattern by compiling
        // the attribute the way a RegExp would (RegExp.source escapes "/",
        // so "a/b" and /a\/b/ are the same pattern). An attribute the
        // browser would ignore (not a valid number / regular expression)
        // can't conflict with anything. A pattern rule with flags such as
        // "i" can't be expressed as an attribute, so it never matches one.
        const { pattern: patternRule, minChars: minCharsRule, maxChars: maxCharsRule } = resolvedValidation;
        const attributeRules = [
            ["pattern", "validation.pattern", FormElement.#patternRuleKey(patternRule), patternRule?.source, FormElement.#patternAttributeKey],
            ["minlength", "validation.minChars", minCharsRule, minCharsRule, FormElement.#lengthAttributeValue],
            ["maxlength", "validation.maxChars", maxCharsRule, maxCharsRule, FormElement.#lengthAttributeValue]
        ];
        for (const [attributeName, ruleName, ruleKey, ruleText, readAttribute] of attributeRules) {
            const attributeText = input.getAttribute(attributeName);
            const attributeKey = attributeText === null ? null : readAttribute(attributeText);
            if (attributeKey !== null && ruleKey !== null && attributeKey !== ruleKey) {
                throw new Error(`FormElement: the input's ${attributeName} attribute ("${attributeText}") doesn't match "${ruleName}" ("${ruleText}").`);
            }
        }

        // "required" would silently do nothing on an input that always
        // has a value, so it's rejected rather than ignored
        if (resolvedValidation.required && Object.hasOwn(FormElement.#REQUIRED_NOT_ALLOWED_TYPES, resolvedType)) {
            throw new Error(`FormElement: "validation.required" has no effect on a "${resolvedType}" input — ${FormElement.#REQUIRED_NOT_ALLOWED_TYPES[resolvedType]}.`);
        }

        // metadata — optional, must be a plain object. plainObjectType
        // already excludes arrays, Dates, RegExps, Maps, Sets, DOM
        // elements, and class instances, so no extra exclusions are
        // needed here.
        if (metadata !== null && metadata !== undefined
            && !Validation.isTypeOf({ value: metadata, type: Validation.types.plainObjectType })) {
            throw new Error(`FormElement: "metadata", if provided, must be an object.`);
        }

        let resolvedMetadata = null;
        if (metadata) {
            try {
                resolvedMetadata = FormElement.#deepFreezeCopy(metadata);
            } catch (error) {
                throw new Error(`FormElement: "metadata" could not be copied.`, { cause: error });
            }
        }

        this.#input = input;
        this.#explicitLabel = explicitLabel;
        this.#labelElement = resolvedLabelElement;
        this.#errorMessageContainer = errorMessageContainer ?? null;
        this.#container = container ?? null;
        this.#type = resolvedType;
        this.#validation = resolvedValidation;
        // deep-copied and frozen, so neither the caller's original object
        // nor the one the getter hands out can change this instance — and
        // since it's frozen, the getter can return the same object every
        // time (stable identity) instead of a fresh copy per access
        this.#metadata = resolvedMetadata;

        // Lock every getter onto the instance itself (non-configurable,
        // non-enumerable), same as FieldValidation — so they can't be
        // shadowed with Object.defineProperty, on subclass instances too.
        for (const name of FormElement.#GETTER_NAMES) {
            Object.defineProperty(this, name, {
                get: Object.getOwnPropertyDescriptor(FormElement.prototype, name).get,
                enumerable: false,
                configurable: false
            });
        }

        // The base class is also frozen; a subclass instance isn't (it
        // still needs to add its own fields), but its getters are locked.
        if (new.target === FormElement) {
            Object.freeze(this);
        }
    }

    // The label used when none was given explicitly: the label element's
    // text, then aria-labelledby/aria-label/name/id — skipping any that
    // are empty or blank.
    #fallbackLabel() {
        return FormElement.#nonBlank(FormElement.#labelText(this.#labelElement))
            ?? FormElement.#nonBlank(FormElement.#ariaLabelledByText(this.#input))
            ?? FormElement.#nonBlank(this.#input.getAttribute?.("aria-label"))
            ?? FormElement.#nonBlank(this.#input.name)
            ?? FormElement.#nonBlank(this.#input.id)
            ?? null;
    }

    // -------------------------------------------------------------
    // Read-only accessors
    // -------------------------------------------------------------

    /** The field element. @returns {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} */
    get input() { return this.#input; }
    /**
     * The field's name in messages, or null if it has none. Live: an
     * explicit label is fixed, but a fallback label is re-read from the
     * page each time, so later changes to the label text show up (e.g.
     * in error messages).
     * @returns {string | null}
     */
    get label() { return this.#explicitLabel ?? this.#fallbackLabel(); }
    /** The field's label element, or null. @returns {HTMLElement | null} */
    get labelElement() { return this.#labelElement; }
    /** Where the field's errors are shown, or null. @returns {HTMLElement | null} */
    get errorMessageContainer() { return this.#errorMessageContainer; }
    /** The field's wrapper, or null. @returns {HTMLElement | null} */
    get container() { return this.#container; }
    /**
     * The field type. The type was validated against the validation rules
     * at construction, so if the element's type has been changed since
     * (e.g. a text input switched to a checkbox), its value would be read
     * the wrong way — that's reported loudly here rather than silently
     * misread.
     * @returns {FieldType}
     * @throws {Error} If the element's type has changed since construction.
     */
    get type() {
        const currentType = FormElement.#detectType(this.#input);
        if (currentType !== this.#type) {
            throw new Error(`FormElement: the input's type changed from "${this.#type}" to "${currentType}" after construction — create a new FormElement for it.`);
        }
        return this.#type;
    }
    /** The field's rules. @returns {import("./fieldValidation.js").FieldValidation} */
    get validation() { return this.#validation; }
    /** The field's metadata (deep-frozen; the same object every time), or null. @returns {Readonly<Record<string | symbol, *>> | null} */
    get metadata() { return this.#metadata; }

    // Freeze the class and its prototype (same reason as Validation and
    // FieldValidation). Must stay the last static element.
    static {
        Object.freeze(FormElement.prototype);
        Object.freeze(FormElement);
    }
}
