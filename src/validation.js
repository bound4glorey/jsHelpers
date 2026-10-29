/**
 * A type name understood by {@link Validation.isTypeOf}. Use the
 * constants in {@link Validation.types} rather than the raw strings.
 * @typedef {"string" | "number" | "boolean" | "date" | "object" | "plainObject"
 *   | "array" | "function" | "regex" | "map" | "set" | "promise" | "error"
 *   | "symbol" | "bigint" | "null" | "undefined" | "jQuery" | "jsElement"} ValidationType
 */

/**
 * Options shared by {@link Validation.getError} and
 * {@link Validation.validateOption}.
 * @typedef {object} ValidateOptionArgs
 * @property {*} [value=null] The value to check.
 * @property {string | null} [variableName=null] Name used in the message
 *   (default "Given value").
 * @property {boolean} [required=true] Whether a missing value (null,
 *   undefined, or blank text) is an error.
 * @property {string | null} [requiredMessage=null] Message to use instead
 *   of "<name> is a required field".
 * @property {ValidationType | null} [type=null] Type the value must have
 *   (null for any).
 * @property {string | null} [typeMessage=null] Message to use instead of
 *   "<name> must be a value of type <type>".
 */

/**
 * General-purpose type checks, used by every other class here. All
 * static; the class, its prototype, and {@link Validation.types} are
 * frozen.
 *
 * @example
 * Validation.isTypeOf({ value: new Date(), type: Validation.types.dateType }); // true
 * Validation.validateOption({ value: name, variableName: "name", type: "string" }); // throws if blank
 */
export class Validation {

    // -------------------------------------------------------------
    // Type constants
    // -------------------------------------------------------------

    /**
     * The type names {@link Validation.isTypeOf} understands, as constants
     * (frozen). `intType` is an alias of `numberType`.
     * @type {Readonly<{
     *   stringType: "string", numberType: "number", intType: "number",
     *   booleanType: "boolean", dateType: "date", objectType: "object",
     *   plainObjectType: "plainObject", arrayType: "array",
     *   functionType: "function", regexType: "regex", mapType: "map",
     *   setType: "set", promiseType: "promise", errorType: "error",
     *   symbolType: "symbol", bigintType: "bigint", nullType: "null",
     *   undefinedType: "undefined", jQueryType: "jQuery",
     *   jsElementType: "jsElement"
     * }>}
     */
    static types = {};

    static {
        Validation.types.stringType = "string";
        Validation.types.numberType = "number";
        Validation.types.intType = Validation.types.numberType; // alias, kept for backward compatibility
        Validation.types.booleanType = "boolean";
        Validation.types.dateType = "date";
        Validation.types.objectType = "object";       // loose: any non-null, non-array object (Date/RegExp/Map/Element/class instances all qualify)
        Validation.types.plainObjectType = "plainObject"; // strict: only `{}`-style objects — excludes arrays, Dates, RegExps, Maps, Sets, DOM elements, and class instances
        Validation.types.arrayType = "array";
        Validation.types.functionType = "function";
        Validation.types.regexType = "regex";
        Validation.types.mapType = "map";
        Validation.types.setType = "set";
        Validation.types.promiseType = "promise";
        Validation.types.errorType = "error";
        Validation.types.symbolType = "symbol";
        Validation.types.bigintType = "bigint";
        Validation.types.nullType = "null";
        Validation.types.undefinedType = "undefined";
        Validation.types.jQueryType = "jQuery";
        Validation.types.jsElementType = "jsElement";

        // Prevent accidental mutation of the shared type constants —
        // e.g. `Validation.types.stringType = "oops"` anywhere in the
        // codebase would otherwise silently corrupt every type check.
        Object.freeze(Validation.types);
    }

    // -------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------

    // True for a "plain" object — literal `{}`, or `Object.create(null)`.
    // Explicitly excludes arrays, Dates, RegExps, Maps, Sets, DOM
    // elements, and instances of any other class. Also recognizes a plain
    // object from another window/iframe, whose prototype is that window's
    // own Object.prototype (so `=== Object.prototype` alone would miss
    // it): any Object.prototype is the end of its chain and has its own
    // `isPrototypeOf`.
    static #isPlainObject(value) {
        if (value === null || typeof value !== "object" || Array.isArray(value)) {
            return false;
        }
        const proto = Object.getPrototypeOf(value);
        if (proto === Object.prototype || proto === null) {
            return true;
        }
        return Object.getPrototypeOf(proto) === null
            && Object.prototype.hasOwnProperty.call(proto, "isPrototypeOf");
    }

    // The built-in type tag (e.g. "[object Date]") — unlike instanceof,
    // this works for objects created in another window/iframe.
    static #tagOf(value) {
        return Object.prototype.toString.call(value);
    }

    // True for a real, valid Date from any window. Date.prototype.getTime
    // only works on a genuine Date (it throws for an object that merely
    // fakes the "[object Date]" tag via Symbol.toStringTag), so calling it
    // is the actual check; the NaN test rejects `new Date("nope")`.
    static #isValidDate(value) {
        try {
            return !Number.isNaN(Date.prototype.getTime.call(value));
        } catch {
            return false;
        }
    }

    // True for a real Map / Set from any window. Map.prototype.has (and
    // Set.prototype.has) only works on a genuine Map (Set) — it throws for
    // anything else, including an object faking the type tag — so calling
    // it is the check. instanceof would miss one from an iframe.
    static #isBranded(value, method) {
        if (value === null || typeof value !== "object") {
            return false;
        }
        try {
            method.call(value, undefined);
            return true;
        } catch {
            return false;
        }
    }

    // True for an Error from any window: Error.isError where the browser
    // has it (a real brand check), else instanceof or the built-in tag.
    static #isError(value) {
        if (typeof Error.isError === "function") {
            return Error.isError(value);
        }
        return value instanceof Error || Validation.#tagOf(value) === "[object Error]";
    }

    // The DOM's own nodeType getter. Calling it on something that isn't a
    // real node throws ("Illegal invocation"), so it doubles as a brand
    // check that works for nodes from any window.
    static #NODE_TYPE_GETTER = typeof Node !== "undefined"
        ? Object.getOwnPropertyDescriptor(Node.prototype, "nodeType").get
        : null;

    // True for any real DOM node (element, text, comment, document,
    // fragment, etc.), from any window. Where there's a DOM, a plain
    // object with a numeric .nodeType is rejected — only a real node
    // passes. Where there's no DOM at all (e.g. Node.js), it falls back to
    // duck-typing via .nodeType, for lightweight test doubles.
    static #isElement(value) {
        if (value === null || typeof value !== "object") {
            return false;
        }
        if (Validation.#NODE_TYPE_GETTER === null) {
            return typeof value.nodeType === "number";
        }
        try {
            Validation.#NODE_TYPE_GETTER.call(value);
            return true;
        } catch {
            return false;
        }
    }

    // True for a thenable (a real Promise, or anything Promise-shaped).
    // Per the Promises/A+ spec a thenable may be a function as well as an
    // object.
    static #isPromise(value) {
        return value instanceof Promise
            || (value !== null
                && (typeof value === "object" || typeof value === "function")
                && typeof value.then === "function");
    }

    // True for jQuery collections — guarded so checking against this
    // type simply returns false when jQuery isn't loaded, rather than
    // crashing with a ReferenceError.
    static #isJQuery(value) {
        return typeof jQuery !== "undefined" && value instanceof jQuery;
    }

    // -------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------

    /**
     * Checks whether `value` matches `type`. If `type` is null/undefined,
     * there's no constraint to check, so this returns true — "no type
     * specified" means "any type is acceptable," not "reject everything."
     *
     * Notable rules: "number" means a finite number (not NaN/Infinity);
     * "date" means a valid Date; "plainObject" means a `{}`-style object;
     * "jsElement" means a real DOM node. Values from another window or
     * iframe are recognized.
     *
     * @param {object} args
     * @param {*} args.value The value to check.
     * @param {ValidationType | null} [args.type=null] The type to check for.
     * @returns {boolean}
     * @throws {Error} If `type` isn't a recognized type name (a programmer error).
     */
    static isTypeOf({ value, type = null }) {
        if (type === null || type === undefined) {
            return true;
        }

        switch (type) {
            case Validation.types.undefinedType:
                return value === undefined;
            case Validation.types.nullType:
                return value === null;
            case Validation.types.arrayType:
                return Array.isArray(value);
            case Validation.types.dateType:
                return Validation.#isValidDate(value);
            case Validation.types.regexType:
                return Validation.#tagOf(value) === "[object RegExp]";
            case Validation.types.mapType:
                return Validation.#isBranded(value, Map.prototype.has);
            case Validation.types.setType:
                return Validation.#isBranded(value, Set.prototype.has);
            case Validation.types.promiseType:
                return Validation.#isPromise(value);
            case Validation.types.errorType:
                return Validation.#isError(value);
            case Validation.types.plainObjectType:
                return Validation.#isPlainObject(value);
            case Validation.types.objectType:
                return value !== null && typeof value === "object" && !Array.isArray(value);
            case Validation.types.jsElementType:
                return Validation.#isElement(value);
            case Validation.types.jQueryType:
                return Validation.#isJQuery(value);
            case Validation.types.numberType: // covers intType too — it's an alias of numberType
                // typeof NaN === "number" (and typeof Infinity === "number")
                // in JS, which is almost never what a caller actually wants
                // when asking "is this a valid number" — so this is
                // deliberately stricter than a plain typeof check.
                return Number.isFinite(value);
            case Validation.types.stringType:
            case Validation.types.booleanType:
            case Validation.types.functionType:
            case Validation.types.symbolType:
            case Validation.types.bigintType:
                return typeof value === type;
            default:
                throw new Error(`Validation: unhandled type "${type}".`);
        }
    }

    /**
     * Classifies a value as valid, missing, or the wrong type. Missing
     * means null, undefined, or blank text ("" or only spaces) — the same
     * as for a form field in FormValidator.
     *
     * Note: `required` defaults to true here (and in getError /
     * validateOption), unlike FieldValidation, where it defaults to false.
     * These helpers are mostly used to check function arguments, where
     * "required unless stated otherwise" is the safe default — so pass
     * `required` explicitly when validating a form field's value.
     *
     * @param {object} args
     * @param {*} args.value The value to check.
     * @param {boolean} [args.required=true] Whether a missing value is an error.
     * @param {ValidationType | null} [args.type=null] The type the value must have.
     * @returns {0 | 1 | 2} 0 = valid, 1 = missing but required, 2 = present but the wrong type.
     * @throws {Error} If `required` isn't a boolean.
     */
    static isValidOption({ value, required = true, type = null }) {
        if (!Validation.isTypeOf({ value: required, type: Validation.types.booleanType })) {
            throw new Error(`Validation: "required" must be a boolean.`);
        }

        const isBlankText = typeof value === "string" && value.trim() === "";
        if (value === null || value === undefined || isBlankText) {
            return required ? 1 : 0;
        }

        return Validation.isTypeOf({ value, type }) ? 0 : 2;
    }

    /**
     * The error message for a value, or null if it's valid (see
     * {@link Validation.isValidOption}).
     *
     * @param {ValidateOptionArgs} args
     * @returns {string | null}
     * @throws {Error} If `variableName` isn't a string, or `required` isn't a boolean.
     */
    static getError({ value = null, variableName = null, required = true, requiredMessage = null, type = null, typeMessage = null }) {
        // variableName ends up in the message, so it must be text (a
        // Symbol or object would otherwise print as "Symbol(x)" or
        // "[object Object]")
        if (variableName !== null && variableName !== undefined && typeof variableName !== "string") {
            throw new Error(`Validation: "variableName", if provided, must be a string.`);
        }
        const validationCode = Validation.isValidOption({ value, required, type });
        const name = (variableName ?? "Given value").trim() || "Given value";

        if (validationCode === 1) {
            return requiredMessage ?? `${name} is a required field`;
        }

        if (validationCode === 2) {
            return typeMessage ?? `${name} must be a value of type ${type}`;
        }

        return null;
    }

    /**
     * Throws if a value is missing (when required) or the wrong type — a
     * one-line guard for function arguments. Throws a real Error (not a
     * raw string), so callers get proper stack traces.
     *
     * @param {ValidateOptionArgs} args
     * @returns {void}
     * @throws {Error} With the message from {@link Validation.getError}.
     */
    static validateOption({ value = null, variableName = null, required = true, requiredMessage = null, type = null, typeMessage = null }) {
        const errorMessage = Validation.getError({ value, variableName, required, requiredMessage, type, typeMessage });

        if (errorMessage !== null) {
            throw new Error(errorMessage);
        }
    }

    // Freeze the class itself (and its prototype). Freezing only the
    // `types` object isn't enough: `Validation.types = {...}` would still
    // replace it wholesale, and `Validation.isTypeOf = () => true` would
    // silently switch off every check built on it. This must stay the
    // last static element, so every static property exists before it runs.
    static {
        Object.freeze(Validation.prototype);
        Object.freeze(Validation);
    }
}