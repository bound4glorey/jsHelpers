describe("FormValidator", () => {

    describe("validateSingleInput - expectedType boolean (checkbox)", () => {
        function buildCheckbox({ checked = false, required = false } = {}) {
            const input = document.createElement("input");
            input.type = "checkbox";
            input.checked = checked;
            return new FormElement({
                input,
                label: "Terms",
                validation: new FieldValidation({ expectedType: "boolean", required })
            });
        }

        describe("value is enforced to a real boolean", () => {
            it("checked -> true", () => {
                const result = FormValidator.validateSingleInput({ inputContainer: buildCheckbox({ checked: true }) });
                expect(result.value).toBe(true);
            });
            it("unchecked -> false", () => {
                const result = FormValidator.validateSingleInput({ inputContainer: buildCheckbox({ checked: false }) });
                expect(result.value).toBe(false);
            });
            it("never a string, even if the checkbox has a value attribute", () => {
                const formElement = buildCheckbox({ checked: true });
                formElement.input.value = "yes";
                const result = FormValidator.validateSingleInput({ inputContainer: formElement });
                expect(result.value).toBe(true);
            });
        });

        describe("optional", () => {
            it("checked is valid", () => {
                const result = FormValidator.validateSingleInput({ inputContainer: buildCheckbox({ checked: true }) });
                expect(result.isValid).toBe(true);
                expect(result.errors).toEqual([]);
            });
            it("unchecked is valid", () => {
                const result = FormValidator.validateSingleInput({ inputContainer: buildCheckbox({ checked: false }) });
                expect(result.isValid).toBe(true);
                expect(result.errors).toEqual([]);
            });
        });

        describe("required", () => {
            it("checked is valid", () => {
                const result = FormValidator.validateSingleInput({ inputContainer: buildCheckbox({ checked: true, required: true }) });
                expect(result.isValid).toBe(true);
            });
            it("unchecked is invalid with a required error", () => {
                const result = FormValidator.validateSingleInput({ inputContainer: buildCheckbox({ checked: false, required: true }) });
                expect(result.isValid).toBe(false);
                expect(result.errors.map(e => e.message)).toEqual(["is a required field"]);
            });
        });

        describe("options are never checked", () => {
            it("a boolean FieldValidation has no options to compare against", () => {
                const formElement = buildCheckbox({ checked: true });
                expect(formElement.validation.options).toBeNull();
                const result = FormValidator.validateSingleInput({ inputContainer: formElement });
                expect(result.errors.some(e => e.message.includes("allowed options"))).toBe(false);
            });
        });
    });

    describe("validateSingleInput - reading and checking values", () => {
        // Builds a FormElement for an <input> (or textarea/select) with the
        // given current value and validation rules.
        function field({ type = "text", value = "", label = "Field", ...rules } = {}) {
            const tag = type === "textarea" ? "textarea" : type === "select" ? "select" : "input";
            const input = document.createElement(tag);
            if (tag === "input") {
                input.type = type;
            }
            if (tag === "select") {
                [value].forEach(optionValue => {
                    const option = document.createElement("option");
                    option.value = optionValue;
                    input.append(option);
                });
            }
            input.value = value;
            return new FormElement({ input, label, validation: new FieldValidation(rules) });
        }
        const check = (options) => FormValidator.validateSingleInput({ inputContainer: field(options) });
        const messages = (result) => result.errors.map(error => error.message);

        describe("argument checks", () => {
            it("a missing inputContainer throws", () => {
                expect(() => FormValidator.validateSingleInput({}))
                    .toThrowError(`FormValidator: "inputContainer" is required and must be a FormElement.`);
            });
            it("no arguments at all throws the same error, not a TypeError", () => {
                expect(() => FormValidator.validateSingleInput())
                    .toThrowError(`FormValidator: "inputContainer" is required and must be a FormElement.`);
            });
            it("a plain object instead of a FormElement throws", () => {
                expect(() => FormValidator.validateSingleInput({ inputContainer: { input: document.createElement("input") } }))
                    .toThrowError(`FormValidator: "inputContainer" is required and must be a FormElement.`);
            });
            it("a non-string fieldErrorTemplate throws", () => {
                expect(() => FormValidator.validateSingleInput({ inputContainer: field(), fieldErrorTemplate: 5 }))
                    .toThrowError(`FormValidator: "fieldErrorTemplate" must be a string.`);
            });
        });

        describe("text values", () => {
            it("are trimmed", () => {
                expect(check({ value: "  hello  " }).value).toEqual("hello");
            });
            it("blank counts as no value", () => {
                expect(check({ value: "   " }).value).toBeNull();
            });
            it("a password keeps its spaces", () => {
                expect(check({ type: "password", value: " secret " }).value).toEqual(" secret ");
            });
            it("a blank password counts as no value", () => {
                expect(check({ type: "password", value: "   " }).value).toBeNull();
            });
            it("works without any String.prototype helpers (nullify/toNumber)", () => {
                expect("nullify" in String.prototype).toBe(false);
                expect(check({ value: "x" }).isValid).toBe(true);
            });
        });

        describe("required", () => {
            it("a blank required field is invalid", () => {
                expect(messages(check({ value: "", required: true }))).toEqual(["is a required field"]);
            });
            it("a blank optional field is valid", () => {
                expect(check({ value: "" }).isValid).toBe(true);
            });
            it("other rules are skipped for a blank field", () => {
                expect(messages(check({ value: "", required: true, minChars: 3 }))).toEqual(["is a required field"]);
            });
            it("a value of 0 counts as present", () => {
                expect(check({ type: "number", value: "0", expectedType: "number", required: true }).isValid).toBe(true);
            });
        });

        describe("numbers", () => {
            const number = (value, rules = {}) => check({ type: "number", value, expectedType: "number", ...rules });
            it("decimals are kept", () => {
                expect(number("2.5").value).toBe(2.5);
            });
            it("negative numbers parse", () => {
                expect(number("-3").value).toBe(-3);
            });
            it("exponent notation parses", () => {
                expect(number("1e3").value).toBe(1000);
            });
            it("a number typed into a text field parses too", () => {
                expect(check({ type: "text", value: "42", expectedType: "number" }).value).toBe(42);
            });
            it("text that only starts with a number is a type error, not a partial number", () => {
                const result = check({ type: "text", value: "12abc", expectedType: "number" });
                expect(result.value).toEqual("12abc");
                expect(messages(result)).toEqual([`does not match the expected type of "number"`]);
            });
            it("hex isn't read as a number", () => {
                expect(check({ type: "text", value: "0x10", expectedType: "number" }).isValid).toBe(false);
            });
            it("a number too large to represent is a type error", () => {
                expect(check({ type: "text", value: "1e999", expectedType: "number" }).isValid).toBe(false);
            });
            it("min: 0 is enforced", () => {
                expect(messages(number("-1", { min: 0 }))).toEqual([`does not meet the minimum value of "0"`]);
            });
            it("max: 0 is enforced", () => {
                expect(messages(number("1", { max: 0 }))).toEqual([`exceeds the maximum value of "0"`]);
            });
            it("a value of 0 is checked against min", () => {
                expect(messages(number("0", { min: 5 }))).toEqual([`does not meet the minimum value of "5"`]);
            });
            it("a value exactly on a bound is valid", () => {
                expect(number("5", { min: 5, max: 5 }).isValid).toBe(true);
            });
            it("a number option matches", () => {
                expect(number("2", { options: [1, 2] }).isValid).toBe(true);
            });
            it("a number not in options fails", () => {
                expect(messages(number("3", { options: [1, 2] }))).toEqual(["must be one of the allowed options"]);
            });
        });

        describe("dates", () => {
            const date = (value, rules = {}) => check({ type: "date", value, expectedType: "date", ...rules });
            it("a date value becomes a local-time Date", () => {
                const value = date("2026-10-27").value;
                expect(value instanceof Date).toBe(true);
                expect([value.getFullYear(), value.getMonth(), value.getDate(), value.getHours()]).toEqual([2026, 9, 27, 0]);
            });
            it("a datetime-local value becomes a local-time Date", () => {
                const value = check({ type: "datetime-local", value: "2026-10-27T14:30", expectedType: "date" }).value;
                expect([value.getHours(), value.getMinutes()]).toEqual([14, 30]);
            });
            it("min is enforced, with the bound shown as a date", () => {
                expect(messages(date("2026-01-01", { min: new Date(2026, 5, 1) }))).toEqual([`does not meet the minimum value of "2026-06-01"`]);
            });
            it("max is enforced", () => {
                expect(messages(date("2026-12-31", { max: new Date(2026, 5, 1) }))).toEqual([`exceeds the maximum value of "2026-06-01"`]);
            });
            it("a date option matches by value, not by reference", () => {
                expect(date("2026-10-27", { options: [new Date(2026, 9, 27)] }).isValid).toBe(true);
            });
            it("a date not in options fails", () => {
                expect(date("2026-10-28", { options: [new Date(2026, 9, 27)] }).isValid).toBe(false);
            });
            it("a date string in a string-typed date field stays a string", () => {
                expect(check({ type: "date", value: "2026-10-27" }).value).toEqual("2026-10-27");
            });
        });

        describe("text rules", () => {
            it("minChars is enforced", () => {
                expect(messages(check({ value: "ab", minChars: 3 }))).toEqual([`does not meet the minimum length of "3"`]);
            });
            it("maxChars is enforced", () => {
                expect(messages(check({ value: "abcd", maxChars: 3 }))).toEqual([`exceeds the maximum length of "3"`]);
            });
            it("pattern must match the whole value, like the HTML attribute", () => {
                expect(messages(check({ value: "abc1", pattern: "\\d+" }))).toEqual(["does not match the required format"]);
            });
            it("a whole-value pattern match is valid", () => {
                expect(check({ value: "123", pattern: "\\d+" }).isValid).toBe(true);
            });
            it("pattern alternatives are all anchored", () => {
                expect(check({ value: "xa", pattern: "a|b" }).isValid).toBe(false);
                expect(check({ value: "b", pattern: "a|b" }).isValid).toBe(true);
            });
            it("pattern flags are kept", () => {
                expect(check({ value: "ABC", pattern: /abc/i }).isValid).toBe(true);
            });
            it("a string option matches", () => {
                expect(check({ type: "select", value: "b", options: ["a", "b"] }).isValid).toBe(true);
            });
            it("several failing rules are all reported", () => {
                expect(messages(check({ value: "a!", minChars: 3, pattern: "[a-z]+" }))).toEqual([
                    `does not meet the minimum length of "3"`,
                    "does not match the required format"
                ]);
            });
        });

        describe("customValidator", () => {
            it("gets the converted value and the FormElement", () => {
                const calls = [];
                const formElement = field({ type: "number", value: "7", expectedType: "number", customValidator: (value, element) => { calls.push([value, element]); return []; } });
                FormValidator.validateSingleInput({ inputContainer: formElement });
                expect(calls).toEqual([[7, formElement]]);
            });
            it("its messages are added as errors", () => {
                expect(messages(check({ value: "x", customValidator: () => ["is taken", "is too common"] }))).toEqual(["is taken", "is too common"]);
            });
            it("an empty array means valid", () => {
                expect(check({ value: "x", customValidator: () => [] }).isValid).toBe(true);
            });
            it("is called with null for a blank field", () => {
                let received;
                check({ value: "", customValidator: (value) => { received = value; return []; } });
                expect(received).toBeNull();
            });
            it("is not called when the value is the wrong type", () => {
                let called = false;
                check({ type: "text", value: "abc", expectedType: "number", customValidator: () => { called = true; return []; } });
                expect(called).toBe(false);
            });
            it("returning something other than an array throws a clear error", () => {
                expect(() => check({ value: "x", label: "Email", customValidator: () => undefined }))
                    .toThrowError(`FormValidator: the customValidator for "Email" must return an array of error message strings.`);
            });
            it("returning non-string messages throws a clear error", () => {
                expect(() => check({ value: "x", label: "Email", customValidator: () => [5] }))
                    .toThrowError(`FormValidator: the customValidator for "Email" must return an array of error message strings.`);
            });
            it("a validator that throws is reported with the field name, original kept as cause", () => {
                try {
                    check({ value: "x", label: "Email", customValidator: () => { throw new Error("boom"); } });
                    fail("expected a throw");
                } catch (error) {
                    expect(error.message).toEqual(`FormValidator: the customValidator for "Email" threw an error.`);
                    expect(error.cause.message).toEqual("boom");
                }
            });
            it("a bound class (not detectable up front) is reported the same way", () => {
                class NotAFunction { }
                expect(() => check({ value: "x", label: "Email", customValidator: NotAFunction.bind(null) }))
                    .toThrowError(`FormValidator: the customValidator for "Email" threw an error.`);
            });
        });

        describe("messages", () => {
            it("fullMessage uses the template", () => {
                const result = FormValidator.validateSingleInput({ inputContainer: field({ label: "Name", required: true }), fieldErrorTemplate: "@#field#@: @#message#@" });
                expect(result.errors[0].fullMessage).toEqual("Name: is a required field");
            });
            it("a label containing a placeholder isn't substituted twice", () => {
                const result = FormValidator.validateSingleInput({ inputContainer: field({ label: "@#message#@", required: true }) });
                expect(result.errors[0].fullMessage).toEqual(`"@#message#@" is a required field`);
            });
            it("an unknown placeholder is left as-is", () => {
                const result = FormValidator.validateSingleInput({ inputContainer: field({ label: "Name", required: true }), fieldErrorTemplate: "@#field#@ @#nope#@" });
                expect(result.errors[0].fullMessage).toEqual("Name @#nope#@");
            });
            it("a field with no label at all is called 'This field'", () => {
                const formElement = new FormElement({ input: document.createElement("input"), validation: new FieldValidation({ required: true }) });
                expect(FormValidator.validateSingleInput({ inputContainer: formElement }).errors[0].field).toEqual("This field");
            });
        });
    });

    // Shared builder for the rest of the specs: an <input> with a label
    // element, an error container, and a wrapper — the same shape
    // FormBuilder produces.
    function buildField({ value = "", label = "Field", rules = {}, metadata = null, type = "text" } = {}) {
        const container = document.createElement("div");
        const labelElement = document.createElement("label");
        labelElement.textContent = label;
        const input = document.createElement("input");
        input.type = type;
        input.value = value;
        const errorMessageContainer = document.createElement("div");
        container.append(labelElement, input, errorMessageContainer);
        return new FormElement({ input, labelElement, errorMessageContainer, container, metadata, validation: new FieldValidation(rules) });
    }

    describe("construction and the field list", () => {
        it("starts empty", () => {
            expect(new FormValidator().getInputContainers()).toEqual([]);
        });
        it("accepts fields in the constructor", () => {
            const field = buildField();
            expect(new FormValidator([field]).getInputContainers()).toEqual([field]);
        });
        it("more than one constructor argument throws", () => {
            expect(() => new FormValidator([], [])).toThrowError(`FormValidator: only accepts 1 parameter.`);
        });
        it("register accepts one FormElement", () => {
            const formValidator = new FormValidator();
            const field = buildField();
            expect(formValidator.register(field)).toEqual([field]);
            expect(formValidator.getInputContainers()).toEqual([field]);
        });
        it("register builds a FormElement from a config object", () => {
            const formValidator = new FormValidator();
            const [built] = formValidator.register({ input: document.createElement("input"), label: "Built" });
            expect(built instanceof FormElement).toBe(true);
            expect(built.label).toEqual("Built");
        });
        it("register rejects something that's neither", () => {
            expect(() => new FormValidator().register("field"))
                .toThrowError(`FormValidator: each field must be a FormElement or a FormElement configuration object.`);
        });
        it("register rejects a Date (an object, but not a config)", () => {
            expect(() => new FormValidator().register(new Date()))
                .toThrowError(`FormValidator: each field must be a FormElement or a FormElement configuration object.`);
        });
        it("registering the same field twice throws", () => {
            const field = buildField({ label: "Email" });
            const formValidator = new FormValidator([field]);
            expect(() => formValidator.register(field)).toThrowError(`FormValidator: the field "Email" is already registered.`);
        });
        it("the same field twice in one call throws", () => {
            const field = buildField({ label: "Email" });
            expect(() => new FormValidator([field, field])).toThrowError(`FormValidator: the field "Email" is already registered.`);
        });
        it("registering is all-or-nothing", () => {
            const formValidator = new FormValidator();
            expect(() => formValidator.register([buildField(), "bad"])).toThrow();
            expect(formValidator.getInputContainers()).toEqual([]);
        });
        it("unregister removes a field and reports whether it was there", () => {
            const field = buildField();
            const formValidator = new FormValidator([field]);
            expect(formValidator.unregister(field)).toBe(true);
            expect(formValidator.unregister(field)).toBe(false);
            expect(formValidator.getInputContainers()).toEqual([]);
        });
        it("getInputContainers returns a copy", () => {
            const formValidator = new FormValidator([buildField()]);
            formValidator.getInputContainers().pop();
            expect(formValidator.getInputContainers().length).toBe(1);
        });
        it("clearInputContainers empties the list", () => {
            const formValidator = new FormValidator([buildField()]);
            formValidator.clearInputContainers();
            expect(formValidator.getInputContainers()).toEqual([]);
        });
        it("two validators keep separate lists", () => {
            const first = new FormValidator([buildField()]);
            const second = new FormValidator();
            expect(first.getInputContainers().length).toBe(1);
            expect(second.getInputContainers().length).toBe(0);
        });
        it("instances, the class, and its prototype are frozen", () => {
            expect(Object.isFrozen(new FormValidator())).toBe(true);
            expect(Object.isFrozen(FormValidator)).toBe(true);
            expect(Object.isFrozen(FormValidator.prototype)).toBe(true);
        });
    });

    describe("validateFormGroupInputs - showing results on the page", () => {
        it("an invalid field gets its errors, label class, and aria-invalid", () => {
            const field = buildField({ label: "Name", rules: { required: true } });
            new FormValidator([field]).validateFormGroupInputs();
            expect(field.errorMessageContainer.textContent).toEqual(`"Name" is a required field`);
            expect(field.labelElement.classList.contains("errorLabel")).toBe(true);
            expect(field.input.getAttribute("aria-invalid")).toEqual("true");
        });
        it("once valid, the errors, class, and aria-invalid are cleared", () => {
            const field = buildField({ label: "Name", rules: { required: true } });
            const formValidator = new FormValidator([field]);
            formValidator.validateFormGroupInputs();
            field.input.value = "Ada";
            formValidator.validateFormGroupInputs();
            expect(field.errorMessageContainer.textContent).toEqual("");
            expect(field.labelElement.classList.contains("errorLabel")).toBe(false);
            expect(field.input.hasAttribute("aria-invalid")).toBe(false);
        });
        it("each error is its own line", () => {
            const field = buildField({ value: "a!", rules: { minChars: 3, pattern: "[a-z]+" } });
            new FormValidator([field]).validateFormGroupInputs({ inputErrorMessage: "@#message#@" });
            expect([...field.errorMessageContainer.children].map(line => line.textContent)).toEqual([
                `does not meet the minimum length of "3"`,
                "does not match the required format"
            ]);
        });
        it("messages are inserted as text, never as HTML", () => {
            const field = buildField({ value: "x", rules: { customValidator: () => ["<img src=x onerror=alert(1)>"] } });
            new FormValidator([field]).validateFormGroupInputs({ inputErrorMessage: "@#message#@" });
            expect(field.errorMessageContainer.querySelector("img")).toBeNull();
            expect(field.errorMessageContainer.textContent).toEqual("<img src=x onerror=alert(1)>");
        });
        it("a field without a label element or error container is validated without touching the page", () => {
            const input = document.createElement("input");
            const field = new FormElement({ input, validation: new FieldValidation({ required: true }) });
            const [result] = new FormValidator([field]).validateFormGroupInputs();
            expect(result.isValid).toBe(false);
        });
        it("results carry the field's metadata (null if none)", () => {
            const results = new FormValidator([buildField({ metadata: { ajaxParamName: "a" } }), buildField()]).validateFormGroupInputs();
            expect(results.map(result => result.metadata)).toEqual([{ ajaxParamName: "a" }, null]);
        });
        it("checks a given FormElement instead of the registered fields", () => {
            const other = buildField({ rules: { required: true } });
            const results = new FormValidator([buildField()]).validateFormGroupInputs({ inputContainers: other });
            expect(results.length).toBe(1);
            expect(results[0].isValid).toBe(false);
        });
        it("checks a given array of FormElements", () => {
            const results = new FormValidator().validateFormGroupInputs({ inputContainers: [buildField(), buildField()] });
            expect(results.length).toBe(2);
        });
        it("rejects inputContainers that aren't FormElements", () => {
            expect(() => new FormValidator().validateFormGroupInputs({ inputContainers: [{ input: document.createElement("input") }] }))
                .toThrowError(`FormValidator: "inputContainers" must be a FormElement or an array of FormElements.`);
        });
        it("rejects an unknown option", () => {
            expect(() => new FormValidator().validateFormGroupInputs({ displayAlrt: true }))
                .toThrowError(/FormValidator: unknown option\(s\) "displayAlrt"\./);
        });
        it("rejects a non-string template", () => {
            expect(() => new FormValidator().validateFormGroupInputs({ inputErrorMessage: 5 }))
                .toThrowError(`FormValidator: "inputErrorMessage" must be a string.`);
        });
        it("rejects a non-boolean displayAlert", () => {
            expect(() => new FormValidator().validateFormGroupInputs({ displayAlert: "yes" }))
                .toThrowError(`FormValidator: "displayAlert" must be a boolean.`);
        });
    });

    describe("validateFormGroupInputs - the alert", () => {
        it("is shown through alertHandler with every error, as text", () => {
            const calls = [];
            const fields = [buildField({ label: "A", rules: { required: true } }), buildField({ label: "B", rules: { required: true } })];
            new FormValidator(fields).validateFormGroupInputs({
                displayAlert: true,
                alertInstructions: "Please fix:",
                alertHandler: (options) => calls.push(options)
            });
            expect(calls.length).toBe(1);
            expect(calls[0].heading).toEqual("Error...");
            expect([...calls[0].element.children].map(line => line.textContent)).toEqual([
                "Please fix:",
                `"A" is a required field`,
                `"B" is a required field`
            ]);
        });
        it("isn't shown when everything is valid", () => {
            let called = false;
            new FormValidator([buildField()]).validateFormGroupInputs({ displayAlert: true, alertHandler: () => { called = true; } });
            expect(called).toBe(false);
        });
        it("uses alertErrorTemplate for each line", () => {
            let element;
            new FormValidator([buildField({ label: "A", rules: { required: true } })]).validateFormGroupInputs({
                displayAlert: true,
                alertErrorTemplate: "- @#field#@: @#message#@",
                alertHandler: (options) => { element = options.element; }
            });
            expect(element.textContent).toEqual("- A: is a required field");
        });
        it("falls back to a global $PCCDB.alert", () => {
            const calls = [];
            globalThis.$PCCDB = { alert: (options) => calls.push(options) };
            try {
                new FormValidator([buildField({ rules: { required: true } })]).validateFormGroupInputs({ displayAlert: true });
            } finally {
                delete globalThis.$PCCDB;
            }
            expect(calls.length).toBe(1);
        });
        it("without a handler or $PCCDB, displayAlert throws a clear error up front", () => {
            expect(() => new FormValidator([buildField()]).validateFormGroupInputs({ displayAlert: true }))
                .toThrowError(`FormValidator: "displayAlert" needs an "alertHandler" function (or a global $PCCDB.alert).`);
        });
        it("a non-function alertHandler throws", () => {
            expect(() => new FormValidator().validateFormGroupInputs({ displayAlert: true, alertHandler: "alert" }))
                .toThrowError(`FormValidator: "alertHandler", if provided, must be a function.`);
        });
    });

    describe("validate - one-call validate and collect", () => {
        it("returns isValid, errors, data, and results", () => {
            const field = buildField({ value: "Ada", metadata: { ajaxParamName: "name" } });
            const outcome = new FormValidator([field]).validate();
            expect(outcome.isValid).toBe(true);
            expect(outcome.errors).toEqual([]);
            expect(outcome.data).toEqual({ name: "Ada" });
            expect(outcome.results.length).toBe(1);
        });
        it("data is null when anything is invalid", () => {
            const outcome = new FormValidator([buildField({ rules: { required: true }, metadata: { ajaxParamName: "name" } })]).validate();
            expect(outcome.isValid).toBe(false);
            expect(outcome.data).toBeNull();
            expect(outcome.errors.length).toBe(1);
        });
        it("a valid form whose fields have no metadata doesn't throw", () => {
            expect(new FormValidator([buildField({ value: "x" })]).validate().data).toEqual({});
        });
        it("data holds converted values (numbers, booleans)", () => {
            const age = buildField({ type: "number", value: "42", rules: { expectedType: "number" }, metadata: { ajaxParamName: "age" } });
            const termsInput = document.createElement("input");
            termsInput.type = "checkbox";
            termsInput.checked = true;
            const terms = new FormElement({ input: termsInput, metadata: { ajaxParamName: "terms" } });
            expect(new FormValidator([age, terms]).validate().data).toEqual({ age: 42, terms: true });
        });
        it("passing inputContainers to validate() throws", () => {
            expect(() => new FormValidator().validate({ inputContainers: [] }))
                .toThrowError(/validate\(\) always checks the registered fields/);
        });
        it("non-object options throw", () => {
            expect(() => new FormValidator().validate("x")).toThrowError(`FormValidator: validate() options must be an object.`);
        });
    });

    describe("getAjaxParamList", () => {
        const result = (ajaxParamName, value, isValid = true) => ({ isValid, errors: [], value, metadata: ajaxParamName === undefined ? null : { ajaxParamName } });

        it("keys each value by ajaxParamName", () => {
            expect(FormValidator.getAjaxParamList([result("a", 1), result("b", "x")])).toEqual({ a: 1, b: "x" });
        });
        it("skips fields without an ajaxParamName", () => {
            expect(FormValidator.getAjaxParamList([result("a", 1), result(undefined, 2)])).toEqual({ a: 1 });
        });
        it("throws if any field is invalid", () => {
            expect(() => FormValidator.getAjaxParamList([result("a", 1, false)])).toThrowError(`FormValidator: not all fields are valid.`);
        });
        it("throws on a duplicate ajaxParamName", () => {
            expect(() => FormValidator.getAjaxParamList([result("a", 1), result("a", 2)]))
                .toThrowError(`FormValidator: more than one field uses the ajaxParamName "a".`);
        });
        it("throws on a non-string ajaxParamName", () => {
            expect(() => FormValidator.getAjaxParamList([result(5, 1)]))
                .toThrowError(`FormValidator: "metadata.ajaxParamName" must be a non-empty string.`);
        });
        it("throws on a non-array", () => {
            expect(() => FormValidator.getAjaxParamList({})).toThrowError(/needs the array of results/);
        });
        it("an ajaxParamName of __proto__ is stored as data, not as the prototype", () => {
            const data = FormValidator.getAjaxParamList([result("__proto__", "x")]);
            expect(Object.getPrototypeOf(data)).toBe(Object.prototype);
            expect(Object.getOwnPropertyDescriptor(data, "__proto__").value).toEqual("x");
        });
    });

    describe("validateSingleInput - the browser's own checks", () => {
        function field(type, value, rules = {}) {
            const input = document.createElement("input");
            input.type = type;
            if (rules.step !== undefined) {
                input.step = rules.step;
                delete rules.step;
            }
            input.value = value;
            return new FormElement({ input, label: "Field", validation: new FieldValidation(rules) });
        }
        // The browser only sets badInput when a person types something it
        // can't parse (input.value is then ""), so it's simulated here.
        function withBadInput(formElement) {
            Object.defineProperty(formElement.input, "validity", {
                get: () => ({ badInput: true, typeMismatch: false, stepMismatch: false })
            });
            return formElement;
        }
        const check = (formElement) => FormValidator.validateSingleInput({ inputContainer: formElement });
        const messages = (result) => result.errors.map(error => error.message);

        it("unparseable input in an optional number field is a type error, not 'empty and valid'", () => {
            const result = check(withBadInput(field("number", "", { expectedType: "number" })));
            expect(result.isValid).toBe(false);
            expect(messages(result)).toEqual([`does not match the expected type of "number"`]);
        });
        it("unparseable input in a required number field is a type error, not 'required'", () => {
            expect(messages(check(withBadInput(field("number", "", { expectedType: "number", required: true })))))
                .toEqual([`does not match the expected type of "number"`]);
        });
        it("unparseable input in a date field is a type error", () => {
            expect(messages(check(withBadInput(field("date", "", { expectedType: "date" })))))
                .toEqual([`does not match the expected type of "date"`]);
        });
        it("a malformed email address is an error, without needing a pattern", () => {
            expect(messages(check(field("email", "not an email")))).toEqual(["is not a valid email address"]);
        });
        it("a valid email address passes", () => {
            expect(check(field("email", "ada@example.com")).isValid).toBe(true);
        });
        it("a malformed URL is an error", () => {
            expect(messages(check(field("url", "nope")))).toEqual(["is not a valid URL"]);
        });
        it("a valid URL passes", () => {
            expect(check(field("url", "https://example.com")).isValid).toBe(true);
        });
        it("a number off the step is an error", () => {
            expect(messages(check(field("number", "1.234", { expectedType: "number", step: "0.01" }))))
                .toEqual([`does not match the allowed step of "0.01"`]);
        });
        it("a number on the step passes", () => {
            expect(check(field("number", "1.23", { expectedType: "number", step: "0.01" })).isValid).toBe(true);
        });
        it("a blank optional email isn't a type mismatch", () => {
            expect(check(field("email", "")).isValid).toBe(true);
        });
    });

    describe("validateSingleInput - disabled fields are skipped", () => {
        it("a disabled required field is valid (the user can't fill it in)", () => {
            const input = document.createElement("input");
            input.disabled = true;
            const result = FormValidator.validateSingleInput({ inputContainer: new FormElement({ input, validation: new FieldValidation({ required: true }) }) });
            expect(result).toEqual({ isValid: true, errors: [], value: null, submitValue: null, disabled: true });
        });
        it("a field inside a disabled <fieldset> is skipped too", () => {
            const fieldset = document.createElement("fieldset");
            fieldset.disabled = true;
            const input = document.createElement("input");
            fieldset.append(input);
            const result = FormValidator.validateSingleInput({ inputContainer: new FormElement({ input, validation: new FieldValidation({ required: true }) }) });
            expect(result.disabled).toBe(true);
            expect(result.isValid).toBe(true);
        });
        it("an enabled field reports disabled: false", () => {
            expect(FormValidator.validateSingleInput({ inputContainer: new FormElement({ input: document.createElement("input") }) }).disabled).toBe(false);
        });
        it("a disabled field's customValidator isn't called", () => {
            let called = false;
            const input = document.createElement("input");
            input.disabled = true;
            FormValidator.validateSingleInput({ inputContainer: new FormElement({ input, validation: new FieldValidation({ customValidator: () => { called = true; return []; } }) }) });
            expect(called).toBe(false);
        });
        it("disabled fields are left out of the submit data", () => {
            const enabled = document.createElement("input");
            enabled.value = "shown";
            const disabled = document.createElement("input");
            disabled.value = "secret";
            disabled.disabled = true;
            const { data } = new FormValidator([
                new FormElement({ input: enabled, metadata: { ajaxParamName: "shown" } }),
                new FormElement({ input: disabled, metadata: { ajaxParamName: "locked" } })
            ]).validate();
            expect(data).toEqual({ shown: "shown" });
        });
        it("a disabled field's old errors are cleared", () => {
            const container = document.createElement("div");
            const input = document.createElement("input");
            const errorMessageContainer = document.createElement("div");
            container.append(input, errorMessageContainer);
            const formValidator = new FormValidator([new FormElement({ input, errorMessageContainer, container, validation: new FieldValidation({ required: true }) })]);
            formValidator.validateFormGroupInputs();
            expect(errorMessageContainer.textContent).not.toEqual("");
            input.disabled = true;
            formValidator.validateFormGroupInputs();
            expect(errorMessageContainer.textContent).toEqual("");
        });
    });

    describe("validateSingleInput - customValidator and required", () => {
        it("isn't called on top of a 'required' error", () => {
            let called = false;
            const input = document.createElement("input");
            const result = FormValidator.validateSingleInput({ inputContainer: new FormElement({ input, validation: new FieldValidation({ required: true, customValidator: () => { called = true; return ["cannot be empty"]; } }) }) });
            expect(called).toBe(false);
            expect(result.errors.map(error => error.message)).toEqual(["is a required field"]);
        });
        it("isn't called for an unchecked required checkbox", () => {
            let called = false;
            const input = document.createElement("input");
            input.type = "checkbox";
            FormValidator.validateSingleInput({ inputContainer: new FormElement({ input, validation: new FieldValidation({ expectedType: "boolean", required: true, customValidator: () => { called = true; return []; } }) }) });
            expect(called).toBe(false);
        });
        it("still runs alongside other rule errors", () => {
            const input = document.createElement("input");
            input.value = "ab";
            const result = FormValidator.validateSingleInput({ inputContainer: new FormElement({ input, validation: new FieldValidation({ minChars: 3, customValidator: () => ["is taken"] }) }) });
            expect(result.errors.map(error => error.message)).toEqual([`does not meet the minimum length of "3"`, "is taken"]);
        });
    });

    describe("submitted values - textareas and dates", () => {
        function textarea(value, rules = {}) {
            const input = document.createElement("textarea");
            input.value = value;
            return new FormElement({ input, label: "Code", validation: new FieldValidation(rules), metadata: { ajaxParamName: "code" } });
        }
        function dateField(type, value) {
            const input = document.createElement("input");
            input.type = type;
            input.value = value;
            return new FormElement({ input, label: "When", metadata: { ajaxParamName: "when" } });
        }

        it("a textarea keeps its leading indentation and trailing newline", () => {
            const text = "    indented();\n        more();\n";
            expect(new FormValidator([textarea(text)]).validate().data).toEqual({ code: text });
        });
        it("a whitespace-only textarea still counts as no value", () => {
            expect(FormValidator.validateSingleInput({ inputContainer: textarea("  \n  ", { required: true }) }).errors[0].message).toEqual("is a required field");
        });
        it("textarea length rules count the text as typed", () => {
            expect(FormValidator.validateSingleInput({ inputContainer: textarea("  ab  ", { maxChars: 4 }) }).isValid).toBe(false);
        });
        it("a date is submitted as the date text, not a Date", () => {
            expect(new FormValidator([dateField("date", "1990-12-10")]).validate().data).toEqual({ when: "1990-12-10" });
        });
        it("a datetime-local is submitted as its text", () => {
            expect(new FormValidator([dateField("datetime-local", "1990-12-10T14:30")]).validate().data).toEqual({ when: "1990-12-10T14:30" });
        });
        it("the date text survives JSON unchanged in any time zone", () => {
            const { data } = new FormValidator([dateField("date", "1990-12-10")]).validate();
            expect(JSON.parse(JSON.stringify(data)).when).toEqual("1990-12-10");
        });
        it("the per-field result value is still a Date", () => {
            const { results } = new FormValidator([dateField("date", "1990-12-10")]).validate();
            expect(results[0].value instanceof Date).toBe(true);
            expect(results[0].submitValue).toEqual("1990-12-10");
        });
        it("other values are submitted as they are", () => {
            const input = document.createElement("input");
            input.type = "number";
            input.value = "42";
            const field = new FormElement({ input, metadata: { ajaxParamName: "n" } });
            expect(new FormValidator([field]).validate().data).toEqual({ n: 42 });
        });
        it("getAjaxParamList falls back to value for results without submitValue", () => {
            expect(FormValidator.getAjaxParamList([{ isValid: true, errors: [], value: 1, metadata: { ajaxParamName: "a" } }])).toEqual({ a: 1 });
        });
    });

    describe("showing results - label class, unchanged errors, all-or-nothing", () => {
        function buildField({ value = "", label = "Field", rules = {} } = {}) {
            const container = document.createElement("div");
            const labelElement = document.createElement("label");
            labelElement.textContent = label;
            const input = document.createElement("input");
            input.value = value;
            const errorMessageContainer = document.createElement("div");
            errorMessageContainer.classList.add("errorMessage");
            container.append(labelElement, input, errorMessageContainer);
            return new FormElement({ input, labelElement, errorMessageContainer, container, validation: new FieldValidation(rules) });
        }

        it("an invalid label gets errorLabel, not the error container's errorMessage class", () => {
            const field = buildField({ rules: { required: true } });
            new FormValidator([field]).validateFormGroupInputs();
            expect(field.labelElement.classList.contains("errorLabel")).toBe(true);
            expect(field.labelElement.classList.contains("errorMessage")).toBe(false);
        });
        it("unchanged errors keep the same elements (no re-announcement)", () => {
            const field = buildField({ rules: { required: true } });
            const formValidator = new FormValidator([field]);
            formValidator.validateFormGroupInputs();
            const firstLine = field.errorMessageContainer.firstElementChild;
            formValidator.validateFormGroupInputs();
            expect(field.errorMessageContainer.firstElementChild).toBe(firstLine);
        });
        it("changed errors are replaced", () => {
            const field = buildField({ rules: { required: true, minChars: 3 } });
            const formValidator = new FormValidator([field]);
            formValidator.validateFormGroupInputs();
            field.input.value = "ab";
            formValidator.validateFormGroupInputs();
            expect(field.errorMessageContainer.textContent).toEqual(`"Field" does not meet the minimum length of "3"`);
        });
        it("a valid field with nothing shown is left untouched", () => {
            const field = buildField({ value: "ok" });
            let mutations = 0;
            const observer = new MutationObserver(records => { mutations += records.length; });
            observer.observe(field.errorMessageContainer, { childList: true, characterData: true, subtree: true });
            new FormValidator([field]).validateFormGroupInputs();
            observer.takeRecords().forEach(() => mutations++);
            observer.disconnect();
            expect(mutations).toBe(0);
        });
        it("stray text someone put in the container is still replaced", () => {
            const field = buildField({ value: "ok" });
            field.errorMessageContainer.textContent = "old text";
            new FormValidator([field]).validateFormGroupInputs();
            expect(field.errorMessageContainer.textContent).toEqual("");
        });
        it("if one field throws, no field's result is shown", () => {
            const first = buildField({ label: "A", rules: { required: true } });
            const second = buildField({ label: "B" });
            const formValidator = new FormValidator([first, second]);
            second.input.setAttribute("type", "checkbox");
            expect(() => formValidator.validateFormGroupInputs()).toThrowError(/the input's type changed/);
            expect(first.errorMessageContainer.textContent).toEqual("");
            expect(first.labelElement.classList.contains("errorLabel")).toBe(false);
        });
    });

    describe("configurable messages and alert heading", () => {
        function field(rules = {}, value = "", type = "text") {
            const input = document.createElement("input");
            input.type = type;
            input.value = value;
            return new FormElement({ input, label: "Nom", validation: new FieldValidation(rules) });
        }
        const messagesFor = (formElement, messages) =>
            FormValidator.validateSingleInput({ inputContainer: formElement, messages }).errors.map(error => error.message);

        it("defaultMessages lists every message, as a copy", () => {
            const defaults = FormValidator.defaultMessages;
            expect(defaults.required).toEqual("is a required field");
            defaults.required = "changed";
            expect(FormValidator.defaultMessages.required).toEqual("is a required field");
        });
        it("a message can be replaced", () => {
            expect(messagesFor(field({ required: true }), { required: "est obligatoire" })).toEqual(["est obligatoire"]);
        });
        it("placeholders are filled with the rule's value", () => {
            expect(messagesFor(field({ minChars: 3 }, "ab"), { minChars: "doit contenir au moins @#minChars#@ caractères" }))
                .toEqual(["doit contenir au moins 3 caractères"]);
        });
        it("min/max/step/type placeholders work", () => {
            expect(messagesFor(field({ expectedType: "number", min: 5 }, "1", "number"), { min: "≥ @#min#@" })).toEqual(["≥ 5"]);
            expect(messagesFor(field({ expectedType: "number" }, "abc", "text"), { type: "pas un @#expectedType#@" })).toEqual(["pas un number"]);
        });
        it("messages that aren't replaced keep their default", () => {
            expect(messagesFor(field({ minChars: 3 }, "ab"), { required: "est obligatoire" })).toEqual([`does not meet the minimum length of "3"`]);
        });
        it("email and url messages can be replaced", () => {
            expect(messagesFor(field({}, "nope", "email"), { email: "adresse invalide" })).toEqual(["adresse invalide"]);
        });
        it("an unknown message key throws", () => {
            expect(() => messagesFor(field(), { requird: "x" })).toThrowError(/FormValidator: unknown message\(s\) "requird"\./);
        });
        it("a non-string message throws", () => {
            expect(() => messagesFor(field(), { required: 5 })).toThrowError(`FormValidator: the "required" message must be a non-empty string.`);
        });
        it("validate() passes messages through", () => {
            const { errors } = new FormValidator([field({ required: true })]).validate({ messages: { required: "est obligatoire" } });
            expect(errors[0].fullMessage).toEqual(`"Nom" est obligatoire`);
        });
        it("a bad messages option fails even when every field is valid", () => {
            expect(() => new FormValidator([field()]).validate({ messages: { nope: "x" } })).toThrowError(/unknown message/);
        });
        it("alertHeading replaces the alert heading", () => {
            let heading;
            new FormValidator([field({ required: true })]).validate({ displayAlert: true, alertHeading: "Erreur", alertHandler: (options) => { heading = options.heading; } });
            expect(heading).toEqual("Erreur");
        });
        it("the alert heading defaults to 'Error...'", () => {
            let heading;
            new FormValidator([field({ required: true })]).validate({ displayAlert: true, alertHandler: (options) => { heading = options.heading; } });
            expect(heading).toEqual("Error...");
        });
        it("a blank alertHeading throws", () => {
            expect(() => new FormValidator().validate({ alertHeading: " " })).toThrowError(`FormValidator: "alertHeading" must be a non-empty string.`);
        });
    });

    describe("global aliases", () => {
        it("the older lowercase names still point at the classes", () => {
            expect(globalThis.fieldValidation).toBe(FieldValidation);
            expect(globalThis.formElement).toBe(FormElement);
            expect(globalThis.formControls).toBe(FormBuilder);
            expect(globalThis.formValidator).toBe(FormValidator);
        });
    });

    describe("dates - calendar days, daylight saving, early years, fractions", () => {
        const pad = (number, length = 2) => String(number).padStart(length, "0");
        const dayText = (date) => `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
        function field(type, value, rules = {}) {
            const input = document.createElement("input");
            input.type = type;
            if (rules.step !== undefined) {
                input.step = rules.step;
                delete rules.step;
            }
            input.value = value;
            return new FormElement({ input, label: "When", validation: new FieldValidation({ expectedType: "date", ...rules }) });
        }
        const check = (formElement) => FormValidator.validateSingleInput({ inputContainer: formElement });

        it("min: now accepts today's date (a date field compares calendar days)", () => {
            expect(check(field("date", dayText(new Date()), { min: new Date() })).isValid).toBe(true);
        });
        it("min: now still rejects yesterday", () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            expect(check(field("date", dayText(yesterday), { min: new Date() })).isValid).toBe(false);
        });
        it("max: the start of today accepts today", () => {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            expect(check(field("date", dayText(new Date()), { max: startOfToday })).isValid).toBe(true);
        });
        it("a date option with a time of day matches that day", () => {
            expect(check(field("date", dayText(new Date()), { options: [new Date()] })).isValid).toBe(true);
        });
        it("a datetime-local field still compares exact times", () => {
            const bound = new Date(2026, 9, 27, 12, 0);
            expect(check(field("datetime-local", "2026-10-27T11:59", { min: bound })).isValid).toBe(false);
            expect(check(field("datetime-local", "2026-10-27T12:00", { min: bound })).isValid).toBe(true);
        });
        it("a datetime inside a daylight-saving gap is accepted, as the browser does", () => {
            // find a local time that doesn't exist (the clock jumps over it)
            let gap = null;
            for (let day = 0; day < 366 && gap === null; day++) {
                for (let hour = 0; hour < 24; hour++) {
                    const candidate = new Date(2026, 0, 1 + day, hour, 30);
                    if (candidate.getHours() !== hour) {
                        gap = { date: new Date(2026, 0, 1 + day), hour };
                        break;
                    }
                }
            }
            if (gap === null) {
                pending("this time zone has no daylight-saving gap in 2026");
                return;
            }
            const text = `${dayText(gap.date)}T${pad(gap.hour)}:30`;
            const formElement = field("datetime-local", text);
            expect(formElement.input.checkValidity()).toBe(true);
            const result = check(formElement);
            expect(result.isValid).toBe(true);
            expect(result.submitValue).toEqual(text);
        });
        it("a calendar-impossible datetime is still rejected", () => {
            const formElement = field("datetime-local", "");
            Object.defineProperty(formElement.input, "value", { get: () => "2026-02-30T10:00" });
            expect(check(formElement).isValid).toBe(false);
        });
        it("years 0000-0099 are read as written", () => {
            const result = check(field("date", "0099-06-15"));
            expect(result.isValid).toBe(true);
            expect(result.value.getFullYear()).toBe(99);
        });
        it("fractional seconds are a decimal fraction", () => {
            expect(check(field("datetime-local", "2026-10-27T14:30:15.5", { step: "0.001" })).value.getMilliseconds()).toBe(500);
            expect(check(field("datetime-local", "2026-10-27T14:30:15.05", { step: "0.001" })).value.getMilliseconds()).toBe(50);
            expect(check(field("datetime-local", "2026-10-27T14:30:15.123", { step: "0.001" })).value.getMilliseconds()).toBe(123);
        });
    });

    describe("messages - @#field#@ inside a rule message", () => {
        it("is filled with the field's label", () => {
            const input = document.createElement("input");
            const formElement = new FormElement({ input, label: "Nom", validation: new FieldValidation({ required: true }) });
            const [error] = FormValidator.validateSingleInput({
                inputContainer: formElement,
                messages: { required: "Le champ @#field#@ est obligatoire" },
                fieldErrorTemplate: "@#message#@"
            }).errors;
            expect(error.message).toEqual("Le champ Nom est obligatoire");
            expect(error.fullMessage).toEqual("Le champ Nom est obligatoire");
        });
        it("works alongside the rule's own placeholder", () => {
            const input = document.createElement("input");
            input.value = "ab";
            const formElement = new FormElement({ input, label: "Code", validation: new FieldValidation({ minChars: 3 }) });
            const [error] = FormValidator.validateSingleInput({ inputContainer: formElement, messages: { minChars: "@#field#@: at least @#minChars#@" } }).errors;
            expect(error.message).toEqual("Code: at least 3");
        });
    });

    describe("fields the browser leaves out of validation", () => {
        it("a read-only required field that's empty is skipped, not an error the user can't fix", () => {
            const input = document.createElement("input");
            input.readOnly = true;
            const result = FormValidator.validateSingleInput({ inputContainer: new FormElement({ input, validation: new FieldValidation({ required: true }) }) });
            expect(input.willValidate).toBe(false);
            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });
        it("a read-only field's rules aren't checked", () => {
            const input = document.createElement("input");
            input.readOnly = true;
            input.value = "ab";
            expect(FormValidator.validateSingleInput({ inputContainer: new FormElement({ input, validation: new FieldValidation({ minChars: 3 }) }) }).isValid).toBe(true);
        });
        it("a read-only field is still submitted, unlike a disabled one", () => {
            const input = document.createElement("input");
            input.readOnly = true;
            input.value = "ACC-42";
            const { data, results } = new FormValidator([new FormElement({ input, metadata: { ajaxParamName: "account" } })]).validate();
            expect(data).toEqual({ account: "ACC-42" });
            expect(results[0].disabled).toBe(false);
        });
        it("a read-only field's customValidator isn't called", () => {
            let called = false;
            const input = document.createElement("input");
            input.readOnly = true;
            FormValidator.validateSingleInput({ inputContainer: new FormElement({ input, validation: new FieldValidation({ customValidator: () => { called = true; return []; } }) }) });
            expect(called).toBe(false);
        });
        it("a hidden field is skipped but submitted", () => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.value = "abc";
            const { isValid, data } = new FormValidator([new FormElement({ input, validation: new FieldValidation({ minChars: 5 }), metadata: { ajaxParamName: "token" } })]).validate();
            expect(isValid).toBe(true);
            expect(data).toEqual({ token: "abc" });
        });
        it("a read-only date field still submits its date text", () => {
            const input = document.createElement("input");
            input.type = "date";
            input.readOnly = true;
            input.value = "2026-10-27";
            expect(new FormValidator([new FormElement({ input, metadata: { ajaxParamName: "d" } })]).validate().data).toEqual({ d: "2026-10-27" });
        });
        it("once it's no longer read-only, it's validated again", () => {
            const input = document.createElement("input");
            input.readOnly = true;
            const formElement = new FormElement({ input, validation: new FieldValidation({ required: true }) });
            expect(FormValidator.validateSingleInput({ inputContainer: formElement }).isValid).toBe(true);
            input.readOnly = false;
            expect(FormValidator.validateSingleInput({ inputContainer: formElement }).isValid).toBe(false);
        });
    });

    describe("validation attributes in hand-written markup", () => {
        function markup(attributes, value = "", type = "text") {
            const input = document.createElement("input");
            input.type = type;
            Object.entries(attributes).forEach(([name, attributeValue]) => input.setAttribute(name, attributeValue));
            if (type === "checkbox") {
                input.checked = value === true;
            } else {
                input.value = value;
            }
            return new FormElement({ input, label: "Field" });
        }
        const messages = (formElement) => FormValidator.validateSingleInput({ inputContainer: formElement }).errors.map(error => error.message);

        it("required makes an empty field invalid", () => {
            expect(messages(markup({ required: "" }))).toEqual(["is a required field"]);
        });
        it("required on a checkbox means it must be checked", () => {
            expect(messages(markup({ required: "" }, false, "checkbox"))).toEqual(["is a required field"]);
            expect(messages(markup({ required: "" }, true, "checkbox"))).toEqual([]);
        });
        it("required on a range is ignored, as the browser does", () => {
            expect(messages(markup({ required: "" }, "50", "range"))).toEqual([]);
        });
        it("pattern is enforced (whole value)", () => {
            expect(messages(markup({ pattern: "\\d+" }, "abc"))).toEqual(["does not match the required format"]);
            expect(messages(markup({ pattern: "\\d+" }, "123"))).toEqual([]);
        });
        it("minlength is enforced, even though the browser only checks it after an edit", () => {
            expect(messages(markup({ minlength: "5" }, "ab"))).toEqual([`does not meet the minimum length of "5"`]);
        });
        it("maxlength is enforced", () => {
            expect(messages(markup({ maxlength: "3" }, "abcd"))).toEqual([`exceeds the maximum length of "3"`]);
        });
        it("an invalid minlength attribute is ignored, as the browser does", () => {
            expect(messages(markup({ minlength: "abc" }, "a"))).toEqual([]);
        });
        it("FieldValidation rules are still used when there are no attributes", () => {
            const input = document.createElement("input");
            input.value = "ab";
            expect(FormValidator.validateSingleInput({ inputContainer: new FormElement({ input, validation: new FieldValidation({ minChars: 3 }) }) }).isValid).toBe(false);
        });
        it("a matching attribute and rule report the problem once", () => {
            const input = document.createElement("input");
            input.setAttribute("minlength", "3");
            input.value = "ab";
            const formElement = new FormElement({ input, validation: new FieldValidation({ minChars: 3 }) });
            expect(FormValidator.validateSingleInput({ inputContainer: formElement }).errors.length).toBe(1);
        });
    });
});
