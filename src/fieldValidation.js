import { Validation } from "./validation.js";

/**
 * The kinds of value a field can hold.
 * @typedef {"string" | "number" | "boolean" | "date"} ExpectedType
 */

/**
 * A field's own validation function. Gets the field's converted value
 * (see FormValidator — a number, Date, boolean, text, or null when blank)
 * and its FormElement, and returns the error messages (an empty array
 * when valid). Must be a plain synchronous function — not async, a
 * generator, or a class.
 * @callback CustomValidator
 * @param {*} value The field's converted value.
 * @param {import("./formElement.js").FormElement} formElement The field.
 * @returns {string[]} Error messages; empty when the value is valid.
 */

/**
 * The rules for a FieldValidation. Every key is optional; unknown keys
 * throw. Which rules are allowed depends on `expectedType`:
 * minChars/maxChars/pattern only on "string"; min/max only on "number"
 * and "date"; none of those on "boolean".
 * @typedef {object} FieldValidationConfig
 * @property {boolean} [required=false] Whether the field must have a value
 *   (for a boolean / checkbox: must be checked).
 * @property {ExpectedType} [expectedType="string"] The kind of value.
 * @property {number | null} [minChars] Minimum length (a whole number, 1 to 2147483647).
 * @property {number | null} [maxChars] Maximum length (a whole number, 1 to 2147483647).
 * @property {number | Date | null} [min] Lowest allowed value — a number,
 *   or a Date for a date field.
 * @property {number | Date | null} [max] Highest allowed value.
 * @property {RegExp | string | null} [pattern] The whole value must match
 *   (like the HTML pattern attribute). The g/y flags are removed.
 * @property {CustomValidator | null} [customValidator] Extra checks.
 * @property {Array<string | number | Date> | null} [options] The only
 *   allowed values. Must match `expectedType`, be unique, and each pass
 *   the other rules. Not allowed for "boolean".
 */

/**
 * A single field's set of validation rules (required, expectedType,
 * minChars/maxChars, min/max, pattern, customValidator, options). Like
 * FormElement, this is validated at construction time: a FieldValidation
 * instance can't exist in a bad shape, so anything holding one doesn't
 * need to re-check it later. Instances are immutable.
 *
 * @example
 * const rules = new FieldValidation({ required: true, minChars: 2, maxChars: 50 });
 * const age = new FieldValidation({ expectedType: "number", min: 18, max: 120 });
 */
export class FieldValidation {

    // Valid values for "expectedType" — sourced from the shared
    // Validation class so this stays in sync with it, rather than
    // duplicating its literal string values here.
    static #VALID_EXPECTED_TYPES = [
        Validation.types.stringType,
        Validation.types.numberType,
        Validation.types.booleanType,
        Validation.types.dateType
    ];

    // Per-expectedType predicates used to check each item of "options"
    // actually matches the field's expected type.
    static #EXPECTED_TYPE_MATCHERS = {
        [Validation.types.stringType]: (value) => Validation.isTypeOf({ value, type: Validation.types.stringType }),
        [Validation.types.numberType]: (value) => Validation.isTypeOf({ value, type: Validation.types.numberType }),
        [Validation.types.dateType]: (value) => Validation.isTypeOf({ value, type: Validation.types.dateType })
    };

    // Every key a config may contain. Anything else is almost certainly a
    // typo (e.g. "requried"), which would otherwise be silently ignored and
    // leave that rule unenforced.
    static #ALLOWED_KEYS = [
        "required", "expectedType", "minChars", "maxChars",
        "min", "max", "pattern", "customValidator", "options"
    ];

    // Which type-specific rules make sense for each expectedType — a
    // length or pattern only applies to text, a numeric/date range only to
    // numbers and dates, and a boolean has nothing to bound. ("options" is
    // handled separately, with its own boolean-specific message.)
    static #RULES_BY_TYPE = {
        [Validation.types.stringType]: ["minChars", "maxChars", "pattern"],
        [Validation.types.numberType]: ["min", "max"],
        [Validation.types.dateType]: ["min", "max"],
        [Validation.types.booleanType]: []
    };

    // A whole number greater than 0 — used for minChars/maxChars, since a
    // length can't be fractional, zero, or negative.
    static #isPositiveInteger(value) {
        return Number.isInteger(value) && value > 0;
    }

    // The largest length the DOM's minLength/maxLength can hold (they're
    // 32-bit signed integers), so a bigger minChars/maxChars could never
    // be applied to the actual field.
    static #MAX_LENGTH = 2147483647;

    // The getters, locked onto every instance (see the end of the
    // constructor).
    static #GETTER_NAMES = [
        "required", "expectedType", "minChars", "maxChars",
        "min", "max", "pattern", "customValidator", "options"
    ];

    // Dates are mutable objects, so they're copied on the way in and on
    // the way out — otherwise a caller could change a bound or an option
    // after construction. Everything else here is a primitive.
    static #copyValue(value) {
        return FieldValidation.#isDate(value) ? new Date(Date.prototype.getTime.call(value)) : value;
    }

    // A valid Date from any window (see Validation's dateType)
    static #isDate(value) {
        return Validation.isTypeOf({ value, type: Validation.types.dateType });
    }

    // True if `text` matches the *whole* pattern — the way the HTML
    // pattern attribute works (an implicit ^(?: … )$) — so /\d+/ rejects
    // "abc1" instead of finding the "1" in it.
    static #fullMatch(pattern, text) {
        return new RegExp(`^(?:${pattern.source})$`, pattern.flags).test(text);
    }

    // True for any RegExp, including one from another window/iframe
    // (where `instanceof RegExp` is false, since each window has its own
    // RegExp constructor).
    static #isRegExp(value) {
        return Object.prototype.toString.call(value) === "[object RegExp]";
    }

    // Why a function can't be used as a customValidator, or null if it
    // can. The validator is called synchronously and its return value is
    // iterated as an array of error messages, so async functions (which
    // return a Promise), generators (which return an iterator), and
    // classes (which can't be called without `new`) would all only fail
    // later, at validation time.
    static #customValidatorProblem(fn) {
        const tag = Object.prototype.toString.call(fn);
        if (tag === "[object AsyncFunction]" || tag === "[object AsyncGeneratorFunction]") {
            return "must not be async — it is called synchronously and must return an array of error messages";
        }
        if (tag === "[object GeneratorFunction]") {
            return "must not be a generator — it must return an array of error messages";
        }
        // "class" followed by anything but a name character or "(" —
        // so `class Foo {}`, `class{}`, and `class/*c*/Foo {}` all match,
        // but a method named `class() {}` or `classify() {}` doesn't
        if (/^class(?![\w$(])/.test(Function.prototype.toString.call(fn))) {
            return "must be a function, not a class";
        }
        return null;
    }

    // -------------------------------------------------------------
    // Private, read-only-from-outside state
    // -------------------------------------------------------------

    #required;
    #expectedType;
    #minChars;
    #maxChars;
    #min;
    #max;
    #pattern;
    #customValidator;
    #options;

    // -------------------------------------------------------------
    // Construction — this IS the validation, same as FormElement.
    // -------------------------------------------------------------

    /**
     * @param {FieldValidationConfig} [config={}] The rules.
     * @throws {Error} If the config isn't a plain object, has unknown keys,
     *   or any rule is invalid or contradicts another (e.g. min > max, or
     *   an option that the other rules would always reject).
     */
    constructor(config = {}) {
        // ensure at most 1 param is sent (0 args is fine — that's what
        // the `config = {}` default is for; 2+ args means the caller
        // almost certainly made a mistake)
        if (arguments.length > 1) {
            throw new Error(`FieldValidation: only accepts 1 parameter.`);
        }

        // config — required plain object (not an array, Date, element, etc.)
        if (!Validation.isTypeOf({ value: config, type: Validation.types.plainObjectType })) {
            throw new Error(`FieldValidation: is missing its "validation" configuration object.`);
        }

        // Read the config exactly once, into a plain snapshot that every
        // check below uses. A getter on the config (or a Proxy) could
        // otherwise throw a raw error mid-validation, or return a
        // different value each time it's read.
        let snapshot;
        try {
            snapshot = Object.assign({}, config);
        } catch (error) {
            throw new Error(`FieldValidation: the configuration object could not be read.`, { cause: error });
        }

        // reject unknown keys (typos) rather than silently ignoring them
        const unknownKeys = Object.keys(snapshot).filter(key => !FieldValidation.#ALLOWED_KEYS.includes(key));
        if (unknownKeys.length > 0) {
            throw new Error(`FieldValidation: unknown option(s) ${unknownKeys.map(key => `"${key}"`).join(", ")}. Allowed: ${FieldValidation.#ALLOWED_KEYS.join(", ")}.`);
        }

        const {
            required = false,
            expectedType = Validation.types.stringType,
            minChars = null,
            maxChars = null,
            min = null,
            max = null,
            pattern = null,
            customValidator = null,
            options = null
        } = snapshot;

        // required — optional (defaults to false), must be a boolean
        if (!Validation.isTypeOf({ value: required, type: Validation.types.booleanType })) {
            throw new Error(`FieldValidation: "validation.required", if provided, must be a boolean.`);
        }

        // expectedType — optional (defaults to "string"), must be one of
        // the recognized types
        if (!Validation.isTypeOf({ value: expectedType, type: Validation.types.stringType }) || !FieldValidation.#VALID_EXPECTED_TYPES.includes(expectedType)) {
            throw new Error(`FieldValidation: "validation.expectedType", if provided, must be one of: ${FieldValidation.#VALID_EXPECTED_TYPES.join(", ")}.`);
        }

        // type-specific rules — only allowed for an expectedType they
        // apply to (e.g. no minChars on a number, no min on a string)
        const isProvided = (value) => value !== null && value !== undefined;
        const typeSpecificRules = { minChars, maxChars, min, max, pattern };
        for (const [ruleName, ruleValue] of Object.entries(typeSpecificRules)) {
            if (isProvided(ruleValue) && !FieldValidation.#RULES_BY_TYPE[expectedType].includes(ruleName)) {
                throw new Error(`FieldValidation: "validation.${ruleName}" is not allowed when "validation.expectedType" is "${expectedType}".`);
            }
        }

        // minChars/maxChars — optional, must be a whole number > 0 (a
        // fractional, 0-, or negative-length requirement doesn't make sense)
        if (isProvided(minChars) && !FieldValidation.#isPositiveInteger(minChars)) {
            throw new Error(`FieldValidation: "validation.minChars", if provided, must be a whole number greater than 0.`);
        }
        if (isProvided(maxChars) && !FieldValidation.#isPositiveInteger(maxChars)) {
            throw new Error(`FieldValidation: "validation.maxChars", if provided, must be a whole number greater than 0.`);
        }
        for (const [ruleName, ruleValue] of [["minChars", minChars], ["maxChars", maxChars]]) {
            if (isProvided(ruleValue) && ruleValue > FieldValidation.#MAX_LENGTH) {
                throw new Error(`FieldValidation: "validation.${ruleName}" must not be greater than ${FieldValidation.#MAX_LENGTH}.`);
            }
        }
        if (isProvided(minChars) && isProvided(maxChars) && minChars > maxChars) {
            throw new Error(`FieldValidation: "validation.minChars" must not be greater than "validation.maxChars".`);
        }

        // min/max — optional. For a number field they must be a valid
        // (finite) number; for a date field, a valid Date. Unlike
        // minChars/maxChars, these bound a value rather than a length, so
        // negative or zero bounds are completely valid (e.g. min: -10,
        // max: 10 for a temperature range).
        const isDateField = expectedType === Validation.types.dateType;
        const boundType = isDateField ? Validation.types.dateType : Validation.types.numberType;
        const boundDescription = isDateField ? "a valid Date" : "a number";
        if (isProvided(min) && !Validation.isTypeOf({ value: min, type: boundType })) {
            throw new Error(`FieldValidation: "validation.min", if provided, must be ${boundDescription}.`);
        }
        if (isProvided(max) && !Validation.isTypeOf({ value: max, type: boundType })) {
            throw new Error(`FieldValidation: "validation.max", if provided, must be ${boundDescription}.`);
        }
        if (isProvided(min) && isProvided(max) && min > max) {
            throw new Error(`FieldValidation: "validation.min" must not be greater than "validation.max".`);
        }

        // pattern — optional; a string is compiled into a RegExp,
        // otherwise it must already be one. (Validation has no RegExp
        // type of its own, so this stays a direct instanceof check.)
        // An uncompilable string gets the same FieldValidation error as
        // any other bad pattern (the browser's SyntaxError is kept as the
        // cause). The stored RegExp is always a fresh copy with the
        // stateful "g"/"y" flags stripped — with those, .test() advances
        // lastIndex and alternates true/false for the same input.
        const patternErrorMessage = `FieldValidation: "validation.pattern", if provided, must be a RegExp (or a string that can be compiled into one).`;
        let resolvedPattern = null;
        if (isProvided(pattern)) {
            if (Validation.isTypeOf({ value: pattern, type: Validation.types.stringType })) {
                try {
                    resolvedPattern = new RegExp(pattern);
                } catch (error) {
                    throw new Error(patternErrorMessage, { cause: error });
                }
            } else if (FieldValidation.#isRegExp(pattern)) {
                resolvedPattern = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ""));
            } else {
                throw new Error(patternErrorMessage);
            }
            // an empty pattern ("" or new RegExp("")) matches every value,
            // so it's almost certainly a mistake rather than a real rule
            if (resolvedPattern.source === "(?:)") {
                throw new Error(`FieldValidation: "validation.pattern", if provided, must not be empty (an empty pattern matches everything).`);
            }
        }

        // customValidator — optional, must be a plain (synchronous,
        // non-generator, non-class) function
        if (customValidator !== null && customValidator !== undefined) {
            if (!Validation.isTypeOf({ value: customValidator, type: Validation.types.functionType })) {
                throw new Error(`FieldValidation: "validation.customValidator", if provided, must be a function.`);
            }
            const problem = FieldValidation.#customValidatorProblem(customValidator);
            if (problem !== null) {
                throw new Error(`FieldValidation: "validation.customValidator" ${problem}.`);
            }
        }

        // options — optional, must be a non-empty array whose values all
        // match expectedType (e.g. all strings for expectedType "string",
        // all numbers for "number", etc.). An empty array is rejected too
        // — a whitelist of zero allowed values isn't meaningful.
        // Not allowed for expectedType "boolean": the type check already
        // restricts the value to true/false, so options would be redundant.
        if (options !== null && options !== undefined) {
            if (expectedType === Validation.types.booleanType) {
                throw new Error(`FieldValidation: "validation.options" is not allowed when "validation.expectedType" is "boolean" — the value is already restricted to true/false.`);
            }
            const optionsErrorMessage = `FieldValidation: "validation.options", if provided, must be an array of values that match the input type.`;
            if (!Validation.isTypeOf({ value: options, type: Validation.types.arrayType }) || options.length === 0) {
                throw new Error(optionsErrorMessage);
            }
            // a sparse array (e.g. ["a", , "b"]) has holes that every()/
            // some() skip, so the checks below would never see them
            for (let index = 0; index < options.length; index++) {
                if (!(index in options)) {
                    throw new Error(`FieldValidation: "validation.options" must not contain empty slots (found one at index ${index}).`);
                }
            }
            const matchesExpectedType = FieldValidation.#EXPECTED_TYPE_MATCHERS[expectedType];
            if (!options.every(optionValue => matchesExpectedType(optionValue))) {
                throw new Error(optionsErrorMessage);
            }
            // Dates are compared by their time value, not by reference
            const optionKeys = options.map(optionValue => FieldValidation.#isDate(optionValue) ? Date.prototype.getTime.call(optionValue) : optionValue);
            if (new Set(optionKeys).size !== optionKeys.length) {
                throw new Error(`FieldValidation: "validation.options" must not contain duplicate values.`);
            }

            // String options are compared against the trimmed input value
            // (blank input counts as "no value"), so a blank option, or one
            // with leading/trailing spaces, could never be matched.
            if (expectedType === Validation.types.stringType
                && options.some(optionValue => optionValue.trim() === "" || optionValue !== optionValue.trim())) {
                throw new Error(`FieldValidation: "validation.options" must not contain blank values or values with leading/trailing spaces.`);
            }

            // Every option must also pass the field's other rules —
            // otherwise it's an allowed value that can never be valid
            // (the same contradiction as min > max).
            // For date options vs min/max, how they compare depends on the
            // field: a "date" input compares calendar days, a
            // "datetime-local" input exact times. A FieldValidation is
            // built from its config alone, without the element, so that
            // check is left to FormElement, which has both.
            const describeOption = (optionValue) => FieldValidation.#isDate(optionValue) ? Date.prototype.toISOString.call(optionValue) : JSON.stringify(optionValue);
            const comparesBounds = expectedType !== Validation.types.dateType;
            const ruleChecks = [
                ["min", (optionValue) => !comparesBounds || !isProvided(min) || optionValue >= min],
                ["max", (optionValue) => !comparesBounds || !isProvided(max) || optionValue <= max],
                ["minChars", (optionValue) => !isProvided(minChars) || optionValue.length >= minChars],
                ["maxChars", (optionValue) => !isProvided(maxChars) || optionValue.length <= maxChars],
                ["pattern", (optionValue) => resolvedPattern === null || FieldValidation.#fullMatch(resolvedPattern, optionValue)]
            ];
            for (const [ruleName, passes] of ruleChecks) {
                const failing = options.filter(optionValue => !passes(optionValue));
                if (failing.length > 0) {
                    throw new Error(`FieldValidation: "validation.options" contains value(s) that "validation.${ruleName}" would always reject: ${failing.map(describeOption).join(", ")}.`);
                }
            }
        }

        this.#required = required;
        this.#expectedType = expectedType;
        this.#minChars = minChars ?? null;
        this.#maxChars = maxChars ?? null;
        this.#min = isProvided(min) ? FieldValidation.#copyValue(min) : null;
        this.#max = isProvided(max) ? FieldValidation.#copyValue(max) : null;
        this.#pattern = resolvedPattern;
        this.#customValidator = customValidator ?? null;
        // copied on the way in, so later changes to the caller's array
        // can't reach into this instance
        this.#options = isProvided(options) ? options.map(FieldValidation.#copyValue) : null;

        // Lock every getter onto the instance itself as a non-configurable
        // property, so Object.defineProperty(instance, "required", ...)
        // can't shadow it after construction — including on a subclass
        // instance. Non-enumerable, so the instance still looks empty to
        // spread/JSON/Object.keys like before.
        for (const name of FieldValidation.#GETTER_NAMES) {
            Object.defineProperty(this, name, {
                get: Object.getOwnPropertyDescriptor(FieldValidation.prototype, name).get,
                enumerable: false,
                configurable: false
            });
        }

        // The base class is also frozen, so nothing can be added to it.
        // A subclass instance isn't (it still needs to add its own fields
        // after this constructor returns), but its getters are locked above.
        if (new.target === FieldValidation) {
            Object.freeze(this);
        }
    }

    // -------------------------------------------------------------
    // Read-only accessors
    // -------------------------------------------------------------

    /** Whether the field must have a value. @returns {boolean} */
    get required() { return this.#required; }
    /** The kind of value the field holds. @returns {ExpectedType} */
    get expectedType() { return this.#expectedType; }
    /** Minimum length, or null. @returns {number | null} */
    get minChars() { return this.#minChars; }
    /** Maximum length, or null. @returns {number | null} */
    get maxChars() { return this.#maxChars; }
    /** Lowest allowed value, or null (a Date is a fresh copy). @returns {number | Date | null} */
    get min() { return FieldValidation.#copyValue(this.#min); }
    /** Highest allowed value, or null (a Date is a fresh copy). @returns {number | Date | null} */
    get max() { return FieldValidation.#copyValue(this.#max); }
    /** The pattern (a fresh copy), or null. @returns {RegExp | null} */
    get pattern() { return this.#pattern ? new RegExp(this.#pattern) : null; }
    /** The custom validator, or null. @returns {CustomValidator | null} */
    get customValidator() { return this.#customValidator; }
    /** The allowed values (a fresh copy), or null. @returns {Array<string | number | Date> | null} */
    get options() { return this.#options ? this.#options.map(FieldValidation.#copyValue) : null; }

    // -------------------------------------------------------------
    // Rule checks
    // -------------------------------------------------------------

    /**
     * Whether `text` satisfies the pattern rule (true if there is none).
     * The whole value must match, the same as the HTML pattern attribute.
     * @param {string} text
     * @returns {boolean}
     */
    matchesPattern(text) {
        return this.#pattern === null || FieldValidation.#fullMatch(this.#pattern, text);
    }

    /**
     * Whether `value` is one of the allowed options (true if there are
     * none). Dates are compared by their exact time, not by reference.
     * (FormValidator compares a "date" input's value by calendar day.)
     * @param {string | number | Date} value
     * @returns {boolean}
     */
    isAllowedOption(value) {
        if (this.#options === null) {
            return true;
        }
        const key = FieldValidation.#isDate(value) ? Date.prototype.getTime.call(value) : value;
        return this.#options.some(optionValue =>
            (FieldValidation.#isDate(optionValue) ? optionValue.getTime() : optionValue) === key);
    }

    // Freeze the class and its prototype (same reason as Validation) — so
    // e.g. Object.defineProperty(FieldValidation.prototype, "required", ...)
    // can't swap a getter out for every instance at once. Must stay the
    // last static element.
    static {
        Object.freeze(FieldValidation.prototype);
        Object.freeze(FieldValidation);
    }
}
