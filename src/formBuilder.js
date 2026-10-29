import { Validation } from "./validation.js";
import { FieldValidation } from "./fieldValidation.js";
import { FormElement } from "./formElement.js";
import { FormValidator } from "./formValidator.js";
import { isTextFormatType, parseTextFormat, TEXT_FORMAT_EXAMPLES } from "./fieldFormats.js";

// Builds fields without registering them anywhere — FormBuilder's private
// builders, handed to FormBuilderForm (below) when FormBuilder is set up,
// so a form can build into its own field list. Not exported.
let buildWithoutRegistering = null;

// The fields in `fields` whose metadata passes `metadata` (a function), or
// all of them (as a copy) if it's null.
function filterByMetadata(fields, metadata) {
    if (metadata === null) {
        return [...fields];
    }
    if (!Validation.isTypeOf({ value: metadata, type: Validation.types.functionType })) {
        throw new Error(`FormBuilder: the "metadata" filter, if provided, must be a function.`);
    }
    return fields.filter(element => metadata(element.metadata));
}

/**
 * Options for {@link FormBuilder.createInputWithLabel}. Only `label` is
 * required; unknown keys throw. Options that only apply to some field
 * types (as in HTML) throw on others.
 * @typedef {object} InputConfig
 * @property {import("./formElement.js").FieldType} [type="text"] The field type.
 * @property {string} label The field's label text (shown as text, never HTML).
 * @property {string | number | boolean | Date | null} [value] Initial value,
 *   matching the field's expectedType (a boolean for a checkbox, a number,
 *   a Date for a date field, or text). Must pass the field's own rules.
 * @property {string | null} [placeholderText] Placeholder (a select's blank
 *   entry text). Text-like, number, textarea and select fields.
 * @property {number | null} [inputSize] The `size` attribute. Text-like fields.
 * @property {number | "any" | null} [stepValue] The `step` attribute
 *   (default 1, so a number field rejects decimals without one).
 *   Number, range, and date/time fields.
 * @property {boolean} [enableAutocomplete=false] Sets autocomplete "on"/"off".
 * @property {Array<string | number | Date> | null} [dataList] Suggested
 *   values (a <datalist>); each must pass the field's rules.
 * @property {boolean} [disabled=false] Disabled (not validated, not submitted).
 * @property {boolean} [readonly=false] Read-only (not validated, still
 *   submitted). Text-like, number, date/time and textarea fields.
 * @property {boolean} [required=false] Must have a value (a checkbox: must
 *   be checked). Not with readonly/disabled, or on hidden/range/color.
 * @property {import("./fieldValidation.js").ExpectedType | null} [expectedType]
 *   Defaults to suit the type: boolean for a checkbox, number for
 *   number/range, date for date/datetime-local, else string.
 * @property {number | null} [minChars] See FieldValidationConfig.
 * @property {number | null} [maxChars] See FieldValidationConfig.
 * @property {number | Date | string | null} [min] A number, a Date for a
 *   date field, or text in the field's format for time/month/week
 *   ("09:30", "2026-06", "2026-W23").
 * @property {number | Date | string | null} [max] Like `min`.
 * @property {RegExp | string | null} [pattern] See FieldValidationConfig.
 * @property {import("./fieldValidation.js").CustomValidator | null} [customValidator]
 *   See FieldValidationConfig.
 * @property {Array<string | number | Date> | null} [options] The only
 *   allowed values; for a select, also its <option>s.
 * @property {Record<string | symbol, *> | null} [metadata] Passed on to the
 *   FormElement (e.g. `{ ajaxParamName: "email" }`).
 */

/**
 * Options for {@link FormBuilder.createInputContainer}: InputConfig plus
 * `info`, help text shown by an info button.
 * @typedef {InputConfig & { info?: string | HTMLElement | null }} InputContainerConfig
 */

/**
 * Options for {@link FormBuilder.createTextAreaContainer}. Only `label` is
 * required; unknown keys throw.
 * @typedef {object} TextAreaConfig
 * @property {string} label The field's label text.
 * @property {string | null} [value] Initial text (kept exactly as given).
 * @property {string | HTMLElement | null} [info] Help text shown by an info button.
 * @property {string | null} [placeholderText]
 * @property {boolean} [disabled=false]
 * @property {boolean} [readonly=false]
 * @property {boolean} [required=false]
 * @property {number | null} [minChars]
 * @property {number | null} [maxChars]
 * @property {RegExp | string | null} [pattern]
 * @property {import("./fieldValidation.js").CustomValidator | null} [customValidator]
 * @property {number} [tabToSpaceCount=0] 0 = Tab moves focus as usual;
 *   1-16 = Tab inserts that many spaces.
 * @property {Record<string | symbol, *> | null} [metadata]
 */

/**
 * Options for {@link FormBuilder.createFormLine}: those of
 * {@link FormBuilder.createInputContainer} or (with type "textarea")
 * {@link FormBuilder.createTextAreaContainer}, plus `fullWidthInput`.
 * @typedef {(InputContainerConfig | (TextAreaConfig & { type: "textarea" })) & { fullWidthInput?: boolean }} FormLineConfig
 */

/**
 * The raw pieces {@link FormBuilder.createInputWithLabel} returns.
 * @typedef {object} InputPieces
 * @property {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} input
 * @property {string} label The label text (trimmed).
 * @property {HTMLLabelElement} labelElement
 * @property {HTMLDataListElement | null} dataListElement
 * @property {import("./formElement.js").FieldType} type
 * @property {import("./fieldValidation.js").FieldValidation} validation
 * @property {Record<string | symbol, *> | null} metadata
 */

/**
 * Builds the DOM for form fields and wraps each one in a
 * {@link FormElement}. A static class — call its methods directly. Every
 * field it builds is also kept in a registry
 * ({@link FormBuilder.getInputContainers}), so a FormValidator can be
 * created for all of them at once.
 *
 * @example
 * const email = FormBuilder.createFormLine({ type: "email", label: "Email", required: true,
 *     metadata: { ajaxParamName: "email" } });
 * form.append(email.container);
 * const formValidator = new FormValidator(FormBuilder.getInputContainers());
 */
export class FormBuilder {

    // -------------------------------------------------------------
    // Internal state
    // -------------------------------------------------------------

    // Every FormElement created via createInputContainer() or
    // createTextAreaContainer() (and so createFormLine()), in order.
    static #inputContainers = [];

    // -------------------------------------------------------------
    // Option tables
    // -------------------------------------------------------------

    // Field types that can be built (the same ones FormElement accepts).
    static #FIELD_TYPES = [
        "textarea", "select",
        "text", "password", "email", "number", "tel", "url", "search",
        "date", "datetime-local", "month", "week", "time",
        "color", "checkbox", "range", "hidden"
    ];

    // The expectedType a field gets when none is given. Anything not
    // listed is "string".
    static #DEFAULT_EXPECTED_TYPES = {
        "checkbox": Validation.types.booleanType,
        "number": Validation.types.numberType,
        "range": Validation.types.numberType,
        "date": Validation.types.dateType,
        "datetime-local": Validation.types.dateType
    };

    // Which field types each HTML-level option applies to (per the HTML
    // spec — e.g. a checkbox has no placeholder, a select can't be
    // read-only).
    static #PLACEHOLDER_TYPES = ["text", "search", "url", "tel", "email", "password", "number", "textarea", "select"];
    static #SIZE_TYPES = ["text", "search", "url", "tel", "email", "password"];
    static #STEP_TYPES = ["number", "range", "date", "datetime-local", "month", "week", "time"];
    static #DATALIST_TYPES = ["text", "search", "url", "tel", "email", "number", "range", "date", "datetime-local", "month", "week", "time", "color"];
    static #READONLY_TYPES = ["text", "search", "url", "tel", "email", "password", "number", "date", "datetime-local", "month", "week", "time", "textarea"];

    // The messages FormValidator would give for `value` in this field —
    // checked on a scratch copy of the input (same attributes, so the
    // browser's own step/range/type checks apply too), against the field's
    // rules minus "required" and customValidator (which may have side
    // effects or depend on the rest of the form).
    static #valueProblems(input, type, validation, value) {
        const scratch = input.cloneNode(false);
        scratch.removeAttribute("id");
        scratch.removeAttribute("list");
        scratch.disabled = false;
        scratch.readOnly = false;
        scratch.value = FormBuilder.#formatValue(value, type);
        const rules = new FieldValidation({
            expectedType: validation.expectedType,
            minChars: validation.minChars,
            maxChars: validation.maxChars,
            min: validation.min,
            max: validation.max,
            pattern: validation.pattern,
            options: validation.options
        });
        const formElement = new FormElement({ input: scratch, type, validation: rules });
        return FormValidator.validateSingleInput({ inputContainer: formElement }).errors.map(error => error.message);
    }

    // True if `source` works as an HTML pattern attribute. Browsers compile
    // the attribute with the "v" flag (or "u" in older ones), whose syntax
    // is stricter than a plain RegExp's — e.g. "[\w.-]+" is fine on its
    // own but invalid with "v" (a bare "-" in a class). An invalid pattern
    // attribute is silently ignored by the browser.
    static #isValidPatternAttribute(source) {
        let flag = "v";
        try {
            new RegExp("", "v");
        } catch {
            flag = "u";
        }
        try {
            new RegExp(`^(?:${source})$`, flag);
            return true;
        } catch {
            return false;
        }
    }

    // The options each builder accepts.
    static #INPUT_KEYS = [
        "type", "label", "value", "placeholderText", "inputSize", "stepValue",
        "enableAutocomplete", "dataList", "disabled", "readonly",
        "required", "expectedType", "minChars", "maxChars", "min", "max",
        "pattern", "customValidator", "options", "metadata"
    ];
    static #CONTAINER_KEYS = [...FormBuilder.#INPUT_KEYS, "info"];
    static #TEXTAREA_KEYS = [
        "label", "value", "info", "placeholderText", "disabled", "readonly",
        "required", "minChars", "maxChars", "pattern", "customValidator",
        "tabToSpaceCount", "metadata"
    ];
    static #FORM_LINE_KEYS = [...new Set([...FormBuilder.#CONTAINER_KEYS, ...FormBuilder.#TEXTAREA_KEYS, "fullWidthInput"])];

    // -------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------

    // FormBuilder is never instantiated.
    constructor() {
        throw new Error(`FormBuilder: is a static class — call its methods directly, e.g. FormBuilder.createFormLine({ ... }).`);
    }

    // Reads a builder's config exactly once into a plain snapshot and
    // rejects unknown keys (typos would otherwise be silently ignored).
    static #readConfig(config, allowedKeys, methodName) {
        if (!Validation.isTypeOf({ value: config, type: Validation.types.plainObjectType })) {
            throw new Error(`FormBuilder: ${methodName}() needs a configuration object.`);
        }
        let snapshot;
        try {
            snapshot = Object.assign({}, config);
        } catch (error) {
            throw new Error(`FormBuilder: the configuration object could not be read.`, { cause: error });
        }
        const unknownKeys = Object.keys(snapshot).filter(key => !allowedKeys.includes(key));
        if (unknownKeys.length > 0) {
            throw new Error(`FormBuilder: unknown option(s) ${unknownKeys.map(key => `"${key}"`).join(", ")} for ${methodName}(). Allowed: ${allowedKeys.join(", ")}.`);
        }
        return snapshot;
    }

    static #requireBoolean(name, value) {
        if (!Validation.isTypeOf({ value, type: Validation.types.booleanType })) {
            throw new Error(`FormBuilder: "${name}" must be a boolean.`);
        }
    }

    // A random unique suffix — crypto.randomUUID where available.
    static #randomId() {
        if (typeof globalThis.crypto?.randomUUID === "function") {
            return globalThis.crypto.randomUUID();
        }
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (placeholder) => {
            const random = Math.random() * 16 | 0;
            return (placeholder === "x" ? random : (random & 0x3 | 0x8)).toString(16);
        });
    }

    // A value as the text an input of `fieldType` expects: a Date as
    // "YYYY-MM-DD" (date) or "YYYY-MM-DDTHH:MM" (datetime-local), a
    // number as plain digits.
    static #formatValue(value, fieldType) {
        if (Validation.isTypeOf({ value, type: Validation.types.dateType })) {
            const pad = (number, length = 2) => String(number).padStart(length, "0");
            const datePart = `${pad(value.getFullYear(), 4)}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
            if (fieldType !== "datetime-local") {
                return datePart;
            }
            const seconds = value.getSeconds() !== 0 ? `:${pad(value.getSeconds())}` : "";
            return `${datePart}T${pad(value.getHours())}:${pad(value.getMinutes())}${seconds}`;
        }
        return String(value);
    }

    // The collapsible "more information" region and the button that
    // toggles it. `info` is text (inserted as text, not HTML) or an
    // element for richer content. The button is a real <button>, so it
    // works from the keyboard, and reports its state via aria-expanded.
    static #buildInfo(info, inputId, label) {
        const region = document.createElement("div");
        region.id = `${inputId}_info`;
        region.classList.add("infoRegion");
        // Hidden with both the hidden attribute (its meaning) and an inline
        // display: none — page CSS that sets `display` on .infoRegion would
        // otherwise override the attribute and show it from the start.
        const setShown = (isShown) => {
            region.hidden = !isShown;
            region.style.display = isShown ? "" : "none";
        };
        setShown(false);
        if (Validation.isTypeOf({ value: info, type: Validation.types.stringType })) {
            region.textContent = info;
        } else {
            region.append(info);
        }

        const button = document.createElement("button");
        button.type = "button";
        button.classList.add("linkButtonInfo", "fa", "fa-info-circle");
        button.setAttribute("aria-label", `More information about ${label}`);
        button.setAttribute("aria-controls", region.id);
        button.setAttribute("aria-expanded", "false");
        button.addEventListener("click", () => {
            setShown(region.hidden);
            button.setAttribute("aria-expanded", String(!region.hidden));
        });

        return { button, region };
    }

    // The DOM's own nodeType getter, used as a brand check (same as
    // FormElement): it throws for anything that isn't a real node, and
    // works for elements from any window, including an iframe.
    static #NODE_TYPE_GETTER = typeof Node !== "undefined"
        ? Object.getOwnPropertyDescriptor(Node.prototype, "nodeType").get
        : null;

    static #isElementNode(value) {
        if (value === null || typeof value !== "object" || FormBuilder.#NODE_TYPE_GETTER === null) {
            return false;
        }
        try {
            return FormBuilder.#NODE_TYPE_GETTER.call(value) === 1; // Node.ELEMENT_NODE
        } catch {
            return false;
        }
    }

    static #checkInfo(info) {
        if (info === null) {
            return;
        }
        const isText = Validation.isTypeOf({ value: info, type: Validation.types.stringType }) && info.trim() !== "";
        const isElement = FormBuilder.#isElementNode(info);
        if (!isText && !isElement) {
            throw new Error(`FormBuilder: "info", if provided, must be a non-empty string or an element.`);
        }
        // An element can only be in one place: reusing it for a second
        // field would silently move it out of the first one.
        if (isElement && info.parentNode !== null) {
            throw new Error(`FormBuilder: the "info" element is already in use elsewhere — pass a separate element for each field (e.g. info.cloneNode(true)).`);
        }
    }

    // The container for a field's error messages: announced to screen
    // readers when it changes, and linked to the input.
    static #buildErrorMessageContainer(inputId, extraClasses = []) {
        const errorMessageContainer = document.createElement("div");
        errorMessageContainer.id = `${inputId}_error`;
        errorMessageContainer.classList.add("errorMessage", ...extraClasses);
        errorMessageContainer.style.fontWeight = "bold";
        errorMessageContainer.setAttribute("aria-live", "polite");
        return errorMessageContainer;
    }

    // Points the input's aria-describedby at its help/error elements.
    static #describeInput(input, elements) {
        const ids = elements.filter(Boolean).map(element => element.id);
        if (ids.length > 0) {
            input.setAttribute("aria-describedby", ids.join(" "));
        }
    }

    // -------------------------------------------------------------
    // Registry access
    // -------------------------------------------------------------

    /**
     * Every field built so far, in creation order (a copy). Pass a filter
     * function to narrow it down by metadata, e.g.
     * `FormBuilder.getInputContainers({ metadata: m => m?.ajaxParamName === "email" })`.
     * @param {object} [filter]
     * @param {((metadata: Readonly<Record<string | symbol, *>> | null) => boolean) | null} [filter.metadata]
     * @returns {import("./formElement.js").FormElement[]}
     * @throws {Error} If the filter isn't a function.
     */
    static getInputContainers({ metadata = null } = {}) {
        return filterByMetadata(FormBuilder.#inputContainers, metadata);
    }

    /**
     * Empties the registry. Call this when a form is torn down/rebuilt so
     * stale fields from a previous render don't stick around.
     * @returns {void}
     */
    static clearInputContainers() {
        FormBuilder.#inputContainers = [];
    }

    // -------------------------------------------------------------
    // Element builders
    // -------------------------------------------------------------

    /**
     * An id based on the field's name plus a random suffix, e.g.
     * "Full_Name_3f2c…". Anything other than letters, digits, "_" and "-"
     * becomes "_", so the id is always safe to use in a CSS selector.
     * @param {string} fieldName
     * @returns {string}
     * @throws {Error} If `fieldName` isn't a non-empty string.
     */
    static generateUniqueId(fieldName) {
        if (!Validation.isTypeOf({ value: fieldName, type: Validation.types.stringType }) || fieldName.trim() === "") {
            throw new Error(`FormBuilder: "fieldName" must be a non-empty string.`);
        }
        return `${fieldName.trim().replace(/[^A-Za-z0-9_-]+/g, "_")}_${FormBuilder.#randomId()}`;
    }

    /**
     * Builds the raw <input>/<select>/<textarea> + <label> pair (plus a
     * <datalist> if `dataList` is given). A lower-level helper: it has no
     * error container or wrapper yet, so it returns the plain pieces
     * rather than a FormElement, and doesn't add anything to the registry.
     * @param {InputConfig} config
     * @returns {InputPieces}
     * @throws {Error} If an option is invalid, doesn't apply to the field
     *   type, or contradicts the field's rules.
     */
    static createInputWithLabel(config) {
        const snapshot = FormBuilder.#readConfig(config, FormBuilder.#INPUT_KEYS, "createInputWithLabel");
        const {
            type = "text",
            label = null,
            value = null,
            placeholderText = null,
            inputSize = null,
            stepValue = null,
            enableAutocomplete = false,
            dataList = null,
            disabled = false,
            readonly = false,
            required = false,
            expectedType = null,
            minChars = null,
            maxChars = null,
            min = null,
            max = null,
            pattern = null,
            customValidator = null,
            options = null,
            metadata = null
        } = snapshot;

        // type and label
        if (!FormBuilder.#FIELD_TYPES.includes(type)) {
            throw new Error(`FormBuilder: "type" must be one of: ${FormBuilder.#FIELD_TYPES.join(", ")}.`);
        }
        if (!Validation.isTypeOf({ value: label, type: Validation.types.stringType }) || label.trim() === "") {
            throw new Error(`FormBuilder: "label" is required and must be a non-empty string.`);
        }
        FormBuilder.#requireBoolean("enableAutocomplete", enableAutocomplete);
        FormBuilder.#requireBoolean("disabled", disabled);
        FormBuilder.#requireBoolean("readonly", readonly);
        FormBuilder.#requireBoolean("required", required);
        // A field the user can't edit is never validated (see
        // FormValidator), so "required" would never be checked — while
        // its label still showed the required marker.
        if (required && (readonly || disabled)) {
            throw new Error(`FormBuilder: a field can't be both "required" and "${readonly ? "readonly" : "disabled"}" — the user couldn't fill it in, so it would never be checked.`);
        }

        // time/month/week fields hold text in a fixed format, so their
        // min/max are text in the same format ("09:30", "2026-06",
        // "2026-W23"), kept as HTML attributes rather than FieldValidation
        // rules (which only take numbers and Dates), and checked by
        // FormValidator. The format is checked here in code (see
        // fieldFormats.js), not by the browser — Firefox doesn't implement
        // month/week inputs and would accept anything.
        const textRange = isTextFormatType(type);
        if (textRange) {
            for (const [name, bound] of [["min", min], ["max", max]]) {
                if (bound !== null && parseTextFormat(type, bound) === null) {
                    throw new Error(`FormBuilder: "${name}" for a "${type}" field must be text like "${TEXT_FORMAT_EXAMPLES[type]}".`);
                }
            }
            // min after max is only meaningful for a time (an overnight
            // range such as 22:00-06:00, which the browser supports)
            if (type !== "time" && min !== null && max !== null && parseTextFormat(type, min) > parseTextFormat(type, max)) {
                throw new Error(`FormBuilder: "min" must not be after "max".`);
            }
        }

        // The validation rules are checked by FieldValidation itself; the
        // DOM attributes below are then set from its normalized values.
        const validation = new FieldValidation({
            required,
            expectedType: expectedType ?? FormBuilder.#DEFAULT_EXPECTED_TYPES[type] ?? Validation.types.stringType,
            minChars,
            maxChars,
            min: textRange ? null : min,
            max: textRange ? null : max,
            pattern,
            customValidator,
            options
        });

        // the element itself
        const inputId = FormBuilder.generateUniqueId(label);
        const tagName = type === "select" || type === "textarea" ? type : "input";
        const input = document.createElement(tagName);
        input.id = inputId;
        if (tagName === "input") {
            input.type = type;
        }

        // options that only apply to some field types
        if (placeholderText !== null) {
            if (!FormBuilder.#PLACEHOLDER_TYPES.includes(type)) {
                throw new Error(`FormBuilder: "placeholderText" is not supported for a "${type}" field.`);
            }
            if (!Validation.isTypeOf({ value: placeholderText, type: Validation.types.stringType })) {
                throw new Error(`FormBuilder: "placeholderText" must be a string.`);
            }
            if (type !== "select") {
                input.placeholder = placeholderText;
            }
        }
        if (inputSize !== null) {
            if (!FormBuilder.#SIZE_TYPES.includes(type)) {
                throw new Error(`FormBuilder: "inputSize" is not supported for a "${type}" field.`);
            }
            if (!Number.isInteger(inputSize) || inputSize <= 0) {
                throw new Error(`FormBuilder: "inputSize" must be a whole number greater than 0.`);
            }
            input.size = inputSize;
        }
        if (stepValue !== null) {
            if (!FormBuilder.#STEP_TYPES.includes(type)) {
                throw new Error(`FormBuilder: "stepValue" is not supported for a "${type}" field.`);
            }
            if (stepValue !== "any" && !(Validation.isTypeOf({ value: stepValue, type: Validation.types.numberType }) && stepValue > 0)) {
                throw new Error(`FormBuilder: "stepValue" must be a number greater than 0, or "any".`);
            }
            input.step = String(stepValue);
        }
        if (readonly && !FormBuilder.#READONLY_TYPES.includes(type)) {
            throw new Error(`FormBuilder: "readonly" is not supported for a "${type}" field.`);
        }

        // a select's choices: the validation options, after a blank
        // "nothing chosen yet" entry (labelled with placeholderText) unless
        // the field is required and already has a value
        if (type === "select" && (validation.options !== null || placeholderText !== null)) {
            if (value === null || !required) {
                const blankOption = document.createElement("option");
                blankOption.value = "";
                blankOption.textContent = placeholderText ?? "";
                input.append(blankOption);
            }
            (validation.options ?? []).forEach(optionValue => {
                const option = document.createElement("option");
                option.value = FormBuilder.#formatValue(optionValue, type);
                option.textContent = option.value;
                input.append(option);
            });
        }

        // suggested values
        let dataListElement = null;
        if (dataList !== null) {
            if (!FormBuilder.#DATALIST_TYPES.includes(type)) {
                throw new Error(`FormBuilder: "dataList" is not supported for a "${type}" field.`);
            }
            if (!Array.isArray(dataList) || dataList.length === 0) {
                throw new Error(`FormBuilder: "dataList", if provided, must be a non-empty array.`);
            }
            // each suggestion must be a value the field could actually
            // accept — numbers for a number field, Dates for a date field
            if (!dataList.every(item => Validation.isTypeOf({ value: item, type: validation.expectedType }))) {
                throw new Error(`FormBuilder: every "dataList" item must be a ${validation.expectedType} to match the field.`);
            }
            dataListElement = document.createElement("datalist");
            dataListElement.id = `${inputId}_list`;
            dataList.forEach(item => {
                const option = document.createElement("option");
                option.value = FormBuilder.#formatValue(item, type);
                dataListElement.append(option);
            });
            input.setAttribute("list", dataListElement.id);
        }

        // the initial value, which must match the field's expectedType
        if (value !== null) {
            if (!Validation.isTypeOf({ value, type: validation.expectedType })) {
                throw new Error(`FormBuilder: "value" must be a ${validation.expectedType} to match the field.`);
            }
            if (type === "checkbox") {
                input.checked = value;
            } else {
                const text = FormBuilder.#formatValue(value, type);
                input.value = text;
                if (type === "select" && input.value !== text) {
                    throw new Error(`FormBuilder: "value" must match one of the select's options.`);
                }
            }
        }

        // attributes from the validation rules, so the browser's own UI
        // (date pickers, number spinners, maxlength) agrees with them
        if (validation.minChars !== null) { input.minLength = validation.minChars; }
        if (validation.maxChars !== null) { input.maxLength = validation.maxChars; }
        if (validation.min !== null) { input.min = FormBuilder.#formatValue(validation.min, type); }
        if (validation.max !== null) { input.max = FormBuilder.#formatValue(validation.max, type); }
        if (textRange && min !== null) { input.min = min; }
        if (textRange && max !== null) { input.max = max; }
        // The pattern attribute only takes the bare source and can't carry
        // flags such as "i", and browsers compile it with stricter syntax
        // rules than a plain RegExp (see #isValidPatternAttribute) — a
        // pattern that doesn't fit is only checked by FormValidator,
        // rather than set as an attribute the browser would silently drop.
        if (validation.pattern !== null && ["", "u", "v"].includes(validation.pattern.flags)
            && FormBuilder.#isValidPatternAttribute(validation.pattern.source)) {
            input.pattern = validation.pattern.source;
        }
        if (validation.required) {
            input.setAttribute("aria-required", "true");
        }

        input.autocomplete = enableAutocomplete ? "on" : "off";
        input.disabled = disabled;
        if (readonly) {
            input.readOnly = true;
        }

        // The browser silently replaces an initial value its input can't
        // hold — a time of "noon" becomes "", a range of 500 is clamped to
        // its max, an invalid color becomes #000000 — so check the value
        // actually stuck. (Done after min/max/step are applied, since
        // those can move a range's value too.) A time/month/week value is
        // also checked in code: a browser that doesn't implement the type
        // (e.g. Firefox for month/week) keeps any text, like "June".
        if (value !== null && type !== "checkbox" && type !== "select") {
            const text = FormBuilder.#formatValue(value, type);
            const stuck = type === "range" ? Number(input.value) === value
                : type === "color" ? /^#[0-9a-f]{6}$/i.test(text)
                    : isTextFormatType(type) ? parseTextFormat(type, text) !== null && input.value !== ""
                        : input.value !== "" && !input.validity.typeMismatch;
            if (!stuck) {
                throw new Error(`FormBuilder: "value" ${JSON.stringify(text)} isn't a valid value for a "${type}" field.`);
            }
        }

        // Every value FormBuilder itself puts in front of the user must
        // pass the field's own rules — otherwise the field is invalid from
        // the start (an initial value), suggests something it then rejects
        // (a dataList item), or allows something that can never be chosen
        // (an option off the field's step, e.g. 1.5 on a number field whose
        // default step is 1). A select's options are its values, so they're
        // checked by FieldValidation already.
        const describeProblems = (problems) => problems.join("; ");
        if (value !== null && type !== "checkbox" && type !== "select") {
            const problems = FormBuilder.#valueProblems(input, type, validation, value);
            if (problems.length > 0) {
                throw new Error(`FormBuilder: "value" ${JSON.stringify(FormBuilder.#formatValue(value, type))} breaks the field's own rules: ${describeProblems(problems)}.`);
            }
        }
        for (const item of dataList ?? []) {
            const problems = FormBuilder.#valueProblems(input, type, validation, item);
            if (problems.length > 0) {
                throw new Error(`FormBuilder: "dataList" item ${JSON.stringify(FormBuilder.#formatValue(item, type))} breaks the field's own rules: ${describeProblems(problems)}.`);
            }
        }
        if (type !== "select") {
            for (const option of validation.options ?? []) {
                const problems = FormBuilder.#valueProblems(input, type, validation, option);
                if (problems.length > 0) {
                    throw new Error(`FormBuilder: option ${JSON.stringify(FormBuilder.#formatValue(option, type))} can never be valid on this field: ${describeProblems(problems)}.`);
                }
            }
        }

        // the label, as text (never HTML)
        const labelElement = document.createElement("label");
        labelElement.htmlFor = inputId;
        labelElement.textContent = label;
        labelElement.classList.add(validation.required ? "requiredLabel" : "optionalLabel");

        return {
            input,
            label: label.trim(),
            labelElement,
            dataListElement,
            type,
            validation,
            metadata
        };
    }

    /**
     * Builds a full single-line field (anything but a textarea): label,
     * input, optional info button + region, and an error container, all in
     * one wrapper <div> (a hidden field gets just the input, in a hidden
     * wrapper). The FormElement is also added to the shared registry (a
     * form from {@link FormBuilder.createForm} keeps its own instead).
     * @param {InputContainerConfig} config
     * @returns {import("./formElement.js").FormElement}
     * @throws {Error} If an option is invalid (see createInputWithLabel),
     *   or the type is "textarea".
     */
    static createInputContainer(config) {
        return FormBuilder.#register(FormBuilder.#buildInputContainer(config));
    }

    // createInputContainer() without registering the field.
    static #buildInputContainer(config) {
        const snapshot = FormBuilder.#readConfig(config, FormBuilder.#CONTAINER_KEYS, "createInputContainer");
        if (snapshot.type === "textarea") {
            throw new Error(`FormBuilder: use createTextAreaContainer() (or createFormLine()) for a "textarea" field.`);
        }
        const { info = null, ...inputConfig } = snapshot;
        FormBuilder.#checkInfo(info);

        const pieces = FormBuilder.createInputWithLabel(inputConfig);
        const { input, labelElement, dataListElement } = pieces;

        // A hidden field has nothing to show: just the input, in a hidden
        // wrapper, with no label element or error area on the page (its
        // label is still used to name it in error messages and alerts).
        if (pieces.type === "hidden") {
            if (info !== null) {
                throw new Error(`FormBuilder: "info" is not supported for a "hidden" field.`);
            }
            const hiddenContainer = document.createElement("div");
            hiddenContainer.hidden = true;
            hiddenContainer.append(input);
            const hiddenFormElement = new FormElement({
                input,
                label: pieces.label,
                container: hiddenContainer,
                type: "hidden",
                validation: pieces.validation,
                metadata: pieces.metadata
            });
            return hiddenFormElement;
        }

        const container = document.createElement("div");
        if (pieces.type === "checkbox") {
            container.append(input, labelElement);
        } else {
            container.append(labelElement, input);
        }
        if (dataListElement) {
            container.append(dataListElement);
        }

        let infoRegion = null;
        if (info !== null) {
            const { button, region } = FormBuilder.#buildInfo(info, input.id, pieces.label);
            container.append(button, region);
            infoRegion = region;
        }

        const errorMessageContainer = FormBuilder.#buildErrorMessageContainer(input.id);
        container.append(errorMessageContainer);
        FormBuilder.#describeInput(input, [infoRegion, errorMessageContainer]);

        const formElement = new FormElement({
            input,
            label: pieces.label,
            labelElement,
            errorMessageContainer,
            container,
            type: pieces.type,
            validation: pieces.validation,
            metadata: pieces.metadata
        });

        return formElement;
    }

    /**
     * Builds a full textarea field: a header row with the label (and info
     * button) plus an expand/minimize button, the textarea, an optional
     * info region, and an error container. The FormElement is also added
     * to the shared registry (a form from {@link FormBuilder.createForm}
     * keeps its own instead).
     * @param {TextAreaConfig} config
     * @returns {import("./formElement.js").FormElement}
     * @throws {Error} If an option is invalid.
     */
    static createTextAreaContainer(config) {
        return FormBuilder.#register(FormBuilder.#buildTextAreaContainer(config));
    }

    // createTextAreaContainer() without registering the field.
    static #buildTextAreaContainer(config) {
        const snapshot = FormBuilder.#readConfig(config, FormBuilder.#TEXTAREA_KEYS, "createTextAreaContainer");
        const { info = null, tabToSpaceCount = 0, ...inputConfig } = snapshot;
        FormBuilder.#checkInfo(info);
        if (!Number.isInteger(tabToSpaceCount) || tabToSpaceCount < 0 || tabToSpaceCount > 16) {
            throw new Error(`FormBuilder: "tabToSpaceCount" must be a whole number from 0 to 16.`);
        }

        const pieces = FormBuilder.createInputWithLabel({ ...inputConfig, type: "textarea" });
        const { input: textarea, labelElement } = pieces;

        Object.assign(labelElement.style, {
            margin: "0 5px",
            alignContent: "center",
            flexGrow: "1"
        });
        Object.assign(textarea.style, {
            width: "100%",
            boxSizing: "border-box",
            resize: "none",
            backgroundColor: "white"
        });

        const container = document.createElement("div");
        container.classList.add("textarea-view");

        // a real <button>, so it works from the keyboard
        const expandButton = document.createElement("button");
        expandButton.type = "button";
        expandButton.classList.add("linkButton", "linkButtonDefault");
        expandButton.style.marginRight = "10px";
        // its accessible name includes the field's label, so with several
        // textareas a screen reader user can tell the buttons apart
        expandButton.title = "Expand";
        expandButton.setAttribute("aria-label", `Expand ${pieces.label}`);
        expandButton.setAttribute("aria-pressed", "false");
        expandButton.addEventListener("click", () => {
            const isFullScreen = container.classList.toggle("full-screen");
            const text = isFullScreen ? "Minimize" : "Expand";
            expandButton.title = text;
            expandButton.setAttribute("aria-label", `${text} ${pieces.label}`);
            expandButton.setAttribute("aria-pressed", String(isFullScreen));
        });

        const headerRow = document.createElement("div");
        Object.assign(headerRow.style, { backgroundColor: "darkgray", display: "flex" });
        headerRow.append(labelElement);

        let infoRegion = null;
        if (info !== null) {
            const { button, region } = FormBuilder.#buildInfo(info, textarea.id, pieces.label);
            headerRow.append(button);
            infoRegion = region;
        }
        headerRow.append(expandButton);

        const errorMessageContainer = FormBuilder.#buildErrorMessageContainer(textarea.id, ["textareaErrorMessage"]);

        const innerContainer = document.createElement("div");
        innerContainer.style.height = "100%";
        innerContainer.append(headerRow, ...(infoRegion ? [infoRegion] : []), textarea, errorMessageContainer);
        container.append(innerContainer);
        FormBuilder.#describeInput(textarea, [infoRegion, errorMessageContainer]);

        if (tabToSpaceCount > 0) {
            textarea.addEventListener("keydown", (event) => {
                if (event.key === "Tab" && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
                    event.preventDefault();
                    textarea.setRangeText(" ".repeat(tabToSpaceCount), textarea.selectionStart, textarea.selectionEnd, "end");
                    // setRangeText doesn't fire "input" on its own
                    textarea.dispatchEvent(new Event("input", { bubbles: true }));
                }
            });
        }

        const formElement = new FormElement({
            input: textarea,
            label: pieces.label,
            labelElement,
            errorMessageContainer,
            container,
            type: "textarea",
            validation: pieces.validation,
            metadata: pieces.metadata
        });

        return formElement;
    }

    /**
     * The usual entry point: builds any field (routing a textarea to
     * createTextAreaContainer() and everything else to
     * createInputContainer()), adds the "formLine" class to its wrapper
     * (plus "checkboxLine" for a checkbox), and — with `fullWidthInput` —
     * the "fullWidth" class to its input. The FormElement is also added to
     * the shared registry (a form from {@link FormBuilder.createForm} keeps
     * its own instead).
     * @param {FormLineConfig} config
     * @returns {import("./formElement.js").FormElement}
     * @throws {Error} If an option is invalid or doesn't apply to the field type.
     */
    static createFormLine(config) {
        return FormBuilder.#register(FormBuilder.#buildFormLine(config));
    }

    // createFormLine() without registering the field.
    static #buildFormLine(config) {
        const snapshot = FormBuilder.#readConfig(config, FormBuilder.#FORM_LINE_KEYS, "createFormLine");
        const { type = "text", fullWidthInput = false, ...fieldConfig } = snapshot;
        FormBuilder.#requireBoolean("fullWidthInput", fullWidthInput);

        // options that only apply to the other kind of field are rejected
        // with a message naming the field type, not a builder method
        const allowedKeys = type === "textarea" ? FormBuilder.#TEXTAREA_KEYS : FormBuilder.#CONTAINER_KEYS;
        const unsupportedKeys = Object.keys(fieldConfig).filter(key => !allowedKeys.includes(key));
        if (unsupportedKeys.length > 0) {
            throw new Error(`FormBuilder: option(s) ${unsupportedKeys.map(key => `"${key}"`).join(", ")} aren't supported for a "${type}" field.`);
        }

        const formElement = type === "textarea"
            ? FormBuilder.#buildTextAreaContainer(fieldConfig)
            : FormBuilder.#buildInputContainer({ type, ...fieldConfig });

        formElement.container.classList.add("formLine");
        // so a checkbox can be laid out beside its label, not above it
        if (formElement.type === "checkbox") {
            formElement.container.classList.add("checkboxLine");
        }
        if (fullWidthInput) {
            formElement.input.classList.add("fullWidth");
        }
        return formElement;
    }

    /**
     * Starts a form with its own field list, separate from the shared
     * registry and from every other form — so two forms on one page don't
     * get mixed together. It has the same builder methods
     * (createFormLine, createInputContainer, createTextAreaContainer).
     * @returns {FormBuilderForm}
     * @example
     * const signup = FormBuilder.createForm();
     * signup.createFormLine({ type: "email", label: "Email", required: true });
     * const { isValid, data } = signup.validate();
     */
    static createForm() {
        return new FormBuilderForm();
    }

    // Adds a built field to the shared registry and returns it.
    static #register(formElement) {
        FormBuilder.#inputContainers.push(formElement);
        return formElement;
    }

    // Hands the private builders to FormBuilderForm, then freezes the class
    // and its prototype, same as the other classes (the registry is
    // private, so it keeps working). Must stay the last static element.
    static {
        buildWithoutRegistering = Object.freeze({
            formLine: (config) => FormBuilder.#buildFormLine(config),
            inputContainer: (config) => FormBuilder.#buildInputContainer(config),
            textAreaContainer: (config) => FormBuilder.#buildTextAreaContainer(config)
        });
        Object.freeze(FormBuilder.prototype);
        Object.freeze(FormBuilder);
    }
}

/**
 * A form with its own field list, from {@link FormBuilder.createForm}. It
 * builds fields exactly like FormBuilder's static methods (same options,
 * same checks), but keeps them in its own list instead of the shared
 * registry.
 *
 * @example
 * const login = FormBuilder.createForm();
 * const signup = FormBuilder.createForm();
 * login.createFormLine({ label: "Username", required: true });
 * signup.createFormLine({ type: "email", label: "Email", required: true });
 * login.validate();  // checks only the login form's fields
 */
export class FormBuilderForm {

    #fields = [];

    constructor() {
        if (arguments.length > 0) {
            throw new Error(`FormBuilderForm: takes no arguments — use FormBuilder.createForm().`);
        }
        // the field list is private state, so freezing the instance only
        // stops properties being added or methods being shadowed
        if (new.target === FormBuilderForm) {
            Object.freeze(this);
        }
    }

    // Adds a built field to this form's list and returns it.
    #add(formElement) {
        this.#fields.push(formElement);
        return formElement;
    }

    /**
     * Builds any field into this form (see {@link FormBuilder.createFormLine}).
     * @param {FormLineConfig} config
     * @returns {import("./formElement.js").FormElement}
     * @throws {Error} If an option is invalid or doesn't apply to the field type.
     */
    createFormLine(config) {
        return this.#add(buildWithoutRegistering.formLine(config));
    }

    /**
     * Builds a single-line field into this form (see
     * {@link FormBuilder.createInputContainer}).
     * @param {InputContainerConfig} config
     * @returns {import("./formElement.js").FormElement}
     * @throws {Error} If an option is invalid, or the type is "textarea".
     */
    createInputContainer(config) {
        return this.#add(buildWithoutRegistering.inputContainer(config));
    }

    /**
     * Builds a textarea field into this form (see
     * {@link FormBuilder.createTextAreaContainer}).
     * @param {TextAreaConfig} config
     * @returns {import("./formElement.js").FormElement}
     * @throws {Error} If an option is invalid.
     */
    createTextAreaContainer(config) {
        return this.#add(buildWithoutRegistering.textAreaContainer(config));
    }

    /**
     * This form's fields, in creation order (a copy). Pass a filter
     * function to narrow it down by metadata, as with
     * {@link FormBuilder.getInputContainers}.
     * @param {object} [filter]
     * @param {((metadata: Readonly<Record<string | symbol, *>> | null) => boolean) | null} [filter.metadata]
     * @returns {import("./formElement.js").FormElement[]}
     * @throws {Error} If the filter isn't a function.
     */
    getInputContainers({ metadata = null } = {}) {
        return filterByMetadata(this.#fields, metadata);
    }

    /**
     * Removes every field from this form's list (the fields' elements
     * aren't touched).
     * @returns {void}
     */
    clearInputContainers() {
        this.#fields = [];
    }

    /**
     * A new FormValidator for this form's current fields. Fields built
     * after this call aren't in it — call it again (or use
     * {@link FormBuilderForm#validate}, which always uses the current
     * fields).
     * @returns {FormValidator}
     */
    createValidator() {
        return new FormValidator(this.#fields);
    }

    /**
     * Validates this form's current fields — the same as
     * {@link FormValidator#validate} on them.
     * @param {import("./formValidator.js").ValidateOptions} [options={}]
     * @returns {import("./formValidator.js").ValidateOutcome}
     * @throws {Error} If an option is invalid (see FormValidator#validate).
     */
    validate(options = {}) {
        return this.createValidator().validate(options);
    }

    // Freeze the class and its prototype, same as the other classes.
    static {
        Object.freeze(FormBuilderForm.prototype);
        Object.freeze(FormBuilderForm);
    }
}
