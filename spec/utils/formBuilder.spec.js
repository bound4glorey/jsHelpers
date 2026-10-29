describe("FormBuilder", () => {

    // The registry is shared (static), so every spec starts from empty.
    beforeEach(() => {
        FormBuilder.clearInputContainers();
    });
    afterEach(() => {
        FormBuilder.clearInputContainers();
    });

    describe("the class itself", () => {
        it("can't be instantiated", () => {
            expect(() => new FormBuilder())
                .toThrowError(`FormBuilder: is a static class — call its methods directly, e.g. FormBuilder.createFormLine({ ... }).`);
        });
        it("is frozen, along with its prototype", () => {
            expect(Object.isFrozen(FormBuilder)).toBe(true);
            expect(Object.isFrozen(FormBuilder.prototype)).toBe(true);
        });
        it("works without any String.prototype helpers (nullify/toNumber)", () => {
            expect("nullify" in String.prototype).toBe(false);
            expect(() => FormBuilder.createFormLine({ label: "Name" })).not.toThrow();
        });
    });

    describe("generateUniqueId", () => {
        it("starts with the field name and is unique", () => {
            const first = FormBuilder.generateUniqueId("Full Name");
            const second = FormBuilder.generateUniqueId("Full Name");
            expect(first.startsWith("Full_Name_")).toBe(true);
            expect(first).not.toEqual(second);
        });
        it("replaces anything that isn't safe in a CSS selector", () => {
            const id = FormBuilder.generateUniqueId(`Bob's "email" <x>`);
            expect(/^[A-Za-z0-9_-]+$/.test(id)).toBe(true);
            expect(() => document.querySelector(`#${id}`)).not.toThrow();
        });
        it("a blank name throws", () => {
            expect(() => FormBuilder.generateUniqueId("   ")).toThrowError(`FormBuilder: "fieldName" must be a non-empty string.`);
        });
        it("a non-string name throws (instead of a TypeError)", () => {
            expect(() => FormBuilder.generateUniqueId(5)).toThrowError(`FormBuilder: "fieldName" must be a non-empty string.`);
        });
    });

    describe("createInputWithLabel", () => {
        const build = (config) => FormBuilder.createInputWithLabel({ label: "Field", ...config });

        describe("config checks", () => {
            it("a non-object config throws", () => {
                expect(() => FormBuilder.createInputWithLabel("x")).toThrowError(`FormBuilder: createInputWithLabel() needs a configuration object.`);
            });
            it("an unknown option throws", () => {
                expect(() => build({ requried: true })).toThrowError(/FormBuilder: unknown option\(s\) "requried" for createInputWithLabel\(\)\./);
            });
            it("a missing label throws", () => {
                expect(() => FormBuilder.createInputWithLabel({})).toThrowError(`FormBuilder: "label" is required and must be a non-empty string.`);
            });
            it("an unknown type throws", () => {
                expect(() => build({ type: "submit" })).toThrowError(/FormBuilder: "type" must be one of:/);
            });
            it("a non-boolean flag throws", () => {
                expect(() => build({ disabled: "yes" })).toThrowError(`FormBuilder: "disabled" must be a boolean.`);
            });
            it("invalid validation rules are reported by FieldValidation", () => {
                expect(() => build({ minChars: -1 })).toThrowError(/FieldValidation: "validation.minChars"/);
            });
            it("doesn't add anything to the registry", () => {
                build({});
                expect(FormBuilder.getInputContainers()).toEqual([]);
            });
        });

        describe("element and label", () => {
            it("builds an <input> of the given type with a matching id", () => {
                const { input, labelElement } = build({ type: "email" });
                expect(input.tagName).toEqual("INPUT");
                expect(input.type).toEqual("email");
                expect(labelElement.htmlFor).toEqual(input.id);
            });
            it("builds a <textarea> and a <select>", () => {
                expect(build({ type: "textarea" }).input.tagName).toEqual("TEXTAREA");
                expect(build({ type: "select" }).input.tagName).toEqual("SELECT");
            });
            it("the label is text, never HTML", () => {
                const { labelElement } = build({ label: "<b>Name</b>" });
                expect(labelElement.querySelector("b")).toBeNull();
                expect(labelElement.textContent).toEqual("<b>Name</b>");
            });
            it("marks the label required/optional", () => {
                expect(build({ required: true }).labelElement.classList.contains("requiredLabel")).toBe(true);
                expect(build({}).labelElement.classList.contains("optionalLabel")).toBe(true);
            });
            it("sets aria-required on a required field", () => {
                expect(build({ required: true }).input.getAttribute("aria-required")).toEqual("true");
            });
        });

        describe("expectedType defaults to suit the type", () => {
            it("checkbox -> boolean", () => {
                expect(build({ type: "checkbox" }).validation.expectedType).toEqual("boolean");
            });
            it("number and range -> number", () => {
                expect(build({ type: "number" }).validation.expectedType).toEqual("number");
                expect(build({ type: "range" }).validation.expectedType).toEqual("number");
            });
            it("date and datetime-local -> date", () => {
                expect(build({ type: "date" }).validation.expectedType).toEqual("date");
                expect(build({ type: "datetime-local" }).validation.expectedType).toEqual("date");
            });
            it("everything else -> string", () => {
                expect(build({ type: "email" }).validation.expectedType).toEqual("string");
            });
            it("an explicit expectedType wins", () => {
                expect(build({ type: "text", expectedType: "number" }).validation.expectedType).toEqual("number");
            });
        });

        describe("initial value", () => {
            it("text", () => {
                expect(build({ value: "hello" }).input.value).toEqual("hello");
            });
            it("a number", () => {
                expect(build({ type: "number", value: 2.5, stepValue: "any" }).input.value).toEqual("2.5");
            });
            it("a Date in a date field", () => {
                expect(build({ type: "date", value: new Date(2026, 9, 7) }).input.value).toEqual("2026-10-07");
            });
            it("a Date in a datetime-local field", () => {
                expect(build({ type: "datetime-local", value: new Date(2026, 9, 7, 9, 5) }).input.value).toEqual("2026-10-07T09:05");
            });
            it("a checkbox is checked by true", () => {
                expect(build({ type: "checkbox", value: true }).input.checked).toBe(true);
            });
            it("no value leaves the field empty", () => {
                expect(build({}).input.value).toEqual("");
            });
            it("a value of the wrong type throws", () => {
                expect(() => build({ type: "number", value: "5" })).toThrowError(`FormBuilder: "value" must be a number to match the field.`);
            });
            it("a non-boolean checkbox value throws", () => {
                expect(() => build({ type: "checkbox", value: "yes" })).toThrowError(`FormBuilder: "value" must be a boolean to match the field.`);
            });
        });

        describe("attributes from the validation rules", () => {
            it("minChars/maxChars -> minLength/maxLength", () => {
                const { input } = build({ minChars: 2, maxChars: 10 });
                expect([input.minLength, input.maxLength]).toEqual([2, 10]);
            });
            it("min/max of 0 are still applied", () => {
                const { input } = build({ type: "number", min: 0, max: 0 });
                expect([input.min, input.max]).toEqual(["0", "0"]);
            });
            it("Date bounds are formatted for the date picker", () => {
                const { input } = build({ type: "date", min: new Date(2026, 0, 1), max: new Date(2026, 11, 31) });
                expect([input.min, input.max]).toEqual(["2026-01-01", "2026-12-31"]);
            });
            it("pattern -> the bare source, not '/.../'", () => {
                expect(build({ pattern: "^\\d+$" }).input.pattern).toEqual("^\\d+$");
            });
            it("a RegExp pattern is accepted", () => {
                expect(build({ pattern: /[a-z]+/ }).input.pattern).toEqual("[a-z]+");
            });
            it("a pattern with flags HTML can't express is left to FormValidator", () => {
                const { input, validation } = build({ pattern: /abc/i });
                expect(input.hasAttribute("pattern")).toBe(false);
                expect(validation.pattern.flags).toEqual("i");
            });
            it("rules are passed on to the FieldValidation", () => {
                const { validation } = build({ required: true, maxChars: 5 });
                expect([validation.required, validation.maxChars]).toEqual([true, 5]);
            });
        });

        describe("HTML-level options", () => {
            it("autocomplete is 'on'/'off', not 'true'/'false'", () => {
                expect(build({ enableAutocomplete: true }).input.autocomplete).toEqual("on");
                expect(build({}).input.autocomplete).toEqual("off");
            });
            it("placeholderText", () => {
                expect(build({ placeholderText: "Jane" }).input.placeholder).toEqual("Jane");
            });
            it("placeholderText on a checkbox throws", () => {
                expect(() => build({ type: "checkbox", placeholderText: "x" })).toThrowError(`FormBuilder: "placeholderText" is not supported for a "checkbox" field.`);
            });
            it("inputSize", () => {
                expect(build({ inputSize: 20 }).input.size).toBe(20);
            });
            it("inputSize on a textarea throws", () => {
                expect(() => build({ type: "textarea", inputSize: 20 })).toThrowError(`FormBuilder: "inputSize" is not supported for a "textarea" field.`);
            });
            it("a non-integer inputSize throws", () => {
                expect(() => build({ inputSize: 2.5 })).toThrowError(`FormBuilder: "inputSize" must be a whole number greater than 0.`);
            });
            it("stepValue allows decimals and 'any'", () => {
                expect(build({ type: "number", stepValue: 0.01 }).input.step).toEqual("0.01");
                expect(build({ type: "number", stepValue: "any" }).input.step).toEqual("any");
            });
            it("stepValue on a text field throws", () => {
                expect(() => build({ stepValue: 1 })).toThrowError(`FormBuilder: "stepValue" is not supported for a "text" field.`);
            });
            it("a zero stepValue throws", () => {
                expect(() => build({ type: "number", stepValue: 0 })).toThrowError(`FormBuilder: "stepValue" must be a number greater than 0, or "any".`);
            });
            it("disabled and readonly", () => {
                const { input } = build({ disabled: true, readonly: true });
                expect([input.disabled, input.readOnly]).toEqual([true, true]);
            });
            it("readonly on a select throws (HTML ignores it there)", () => {
                expect(() => build({ type: "select", readonly: true })).toThrowError(`FormBuilder: "readonly" is not supported for a "select" field.`);
            });
        });

        describe("dataList", () => {
            it("builds a linked <datalist>", () => {
                const { input, dataListElement } = build({ dataList: ["red", "green", "3"] });
                expect(dataListElement.tagName).toEqual("DATALIST");
                expect(input.getAttribute("list")).toEqual(dataListElement.id);
                expect([...dataListElement.children].map(option => option.value)).toEqual(["red", "green", "3"]);
            });
            it("is null when not given", () => {
                expect(build({}).dataListElement).toBeNull();
            });
            it("an empty list throws", () => {
                expect(() => build({ dataList: [] })).toThrowError(`FormBuilder: "dataList", if provided, must be a non-empty array.`);
            });
            it("on a checkbox throws", () => {
                expect(() => build({ type: "checkbox", dataList: ["a"] })).toThrowError(`FormBuilder: "dataList" is not supported for a "checkbox" field.`);
            });
        });

        describe("select options", () => {
            const optionValues = (select) => [...select.options].map(option => option.value);
            it("options become <option>s after a blank entry", () => {
                expect(optionValues(build({ type: "select", options: ["a", "b"] }).input)).toEqual(["", "a", "b"]);
            });
            it("the blank entry uses placeholderText", () => {
                expect(build({ type: "select", options: ["a"], placeholderText: "Choose…" }).input.options[0].textContent).toEqual("Choose…");
            });
            it("a required select with a value has no blank entry", () => {
                const { input } = build({ type: "select", options: ["a", "b"], required: true, value: "b" });
                expect(optionValues(input)).toEqual(["a", "b"]);
                expect(input.value).toEqual("b");
            });
            it("number options", () => {
                const { input } = build({ type: "select", expectedType: "number", options: [1, 2], value: 2 });
                expect(input.value).toEqual("2");
            });
            it("a value that isn't one of the options throws", () => {
                expect(() => build({ type: "select", options: ["a"], value: "z" })).toThrowError(`FormBuilder: "value" must match one of the select's options.`);
            });
            it("a select without options is left empty for the caller to fill", () => {
                expect(build({ type: "select" }).input.options.length).toBe(0);
            });
        });
    });

    describe("createInputContainer", () => {
        it("returns a registered FormElement", () => {
            const formElement = FormBuilder.createInputContainer({ label: "Name" });
            expect(formElement instanceof FormElement).toBe(true);
            expect(FormBuilder.getInputContainers()).toEqual([formElement]);
        });
        it("puts the label before the input, and the error container last", () => {
            const { container, input, labelElement, errorMessageContainer } = FormBuilder.createInputContainer({ label: "Name" });
            expect([...container.children]).toEqual([labelElement, input, errorMessageContainer]);
        });
        it("puts a checkbox before its label", () => {
            const { container, input, labelElement } = FormBuilder.createInputContainer({ type: "checkbox", label: "Agree" });
            expect(container.children[0]).toBe(input);
            expect(container.children[1]).toBe(labelElement);
        });
        it("a checkbox gets boolean validation without being told (no longer throws)", () => {
            expect(FormBuilder.createInputContainer({ type: "checkbox", label: "Agree" }).validation.expectedType).toEqual("boolean");
        });
        it("a number field gets number validation without being told (no longer throws)", () => {
            expect(FormBuilder.createInputContainer({ type: "number", label: "Age" }).validation.expectedType).toEqual("number");
        });
        it("the error container is announced and linked to the input", () => {
            const { input, errorMessageContainer } = FormBuilder.createInputContainer({ label: "Name" });
            expect(errorMessageContainer.getAttribute("aria-live")).toEqual("polite");
            expect(input.getAttribute("aria-describedby")).toEqual(errorMessageContainer.id);
        });
        it("includes the datalist in the container", () => {
            const { container } = FormBuilder.createInputContainer({ label: "Color", dataList: ["red"] });
            expect(container.querySelector("datalist")).not.toBeNull();
        });
        it("passes metadata through", () => {
            expect(FormBuilder.createInputContainer({ label: "Name", metadata: { ajaxParamName: "name" } }).metadata).toEqual({ ajaxParamName: "name" });
        });
        it("a textarea type points to createTextAreaContainer", () => {
            expect(() => FormBuilder.createInputContainer({ type: "textarea", label: "Notes" }))
                .toThrowError(`FormBuilder: use createTextAreaContainer() (or createFormLine()) for a "textarea" field.`);
        });

        describe("info", () => {
            it("text info is a hidden region toggled by a real button", () => {
                const { container, input } = FormBuilder.createInputContainer({ label: "Name", info: "Your <b>full</b> name" });
                const button = container.querySelector("button");
                const region = container.querySelector(".infoRegion");
                expect(button.type).toEqual("button");
                expect(button.getAttribute("aria-controls")).toEqual(region.id);
                expect(region.hidden).toBe(true);
                expect(region.textContent).toEqual("Your <b>full</b> name");
                expect(region.querySelector("b")).toBeNull();
                expect(input.getAttribute("aria-describedby").split(" ")).toContain(region.id);

                button.click();
                expect(region.hidden).toBe(false);
                expect(button.getAttribute("aria-expanded")).toEqual("true");
                button.click();
                expect(region.hidden).toBe(true);
                expect(button.getAttribute("aria-expanded")).toEqual("false");
            });
            it("an element can be used for rich info", () => {
                const rich = document.createElement("p");
                rich.innerHTML = "See <a href='#'>the guide</a>";
                const { container } = FormBuilder.createInputContainer({ label: "Name", info: rich });
                expect(container.querySelector(".infoRegion a")).not.toBeNull();
            });
            it("no info means no button or region", () => {
                const { container } = FormBuilder.createInputContainer({ label: "Name" });
                expect(container.querySelector("button")).toBeNull();
            });
            it("blank info throws", () => {
                expect(() => FormBuilder.createInputContainer({ label: "Name", info: " " }))
                    .toThrowError(`FormBuilder: "info", if provided, must be a non-empty string or an element.`);
            });
        });
    });

    describe("createTextAreaContainer", () => {
        it("returns a registered FormElement around a textarea", () => {
            const formElement = FormBuilder.createTextAreaContainer({ label: "Notes" });
            expect(formElement.type).toEqual("textarea");
            expect(FormBuilder.getInputContainers()).toEqual([formElement]);
        });
        it("sets the initial value", () => {
            expect(FormBuilder.createTextAreaContainer({ label: "Notes", value: "hi" }).input.value).toEqual("hi");
        });
        it("rejects options that don't apply to a textarea", () => {
            expect(() => FormBuilder.createTextAreaContainer({ label: "Notes", min: 1 })).toThrowError(/unknown option\(s\) "min" for createTextAreaContainer\(\)/);
        });
        it("the expand button is a real button that toggles full screen", () => {
            const { container } = FormBuilder.createTextAreaContainer({ label: "Notes" });
            const button = container.querySelector("button[aria-pressed]");
            expect(button.type).toEqual("button");
            button.click();
            expect(container.classList.contains("full-screen")).toBe(true);
            expect(button.title).toEqual("Minimize");
            expect(button.getAttribute("aria-pressed")).toEqual("true");
            button.click();
            expect(container.classList.contains("full-screen")).toBe(false);
            expect(button.title).toEqual("Expand");
        });
        it("info is shown (it used to be ignored for textareas)", () => {
            const { container } = FormBuilder.createTextAreaContainer({ label: "Notes", info: "Anything else?" });
            expect(container.querySelector(".infoRegion").textContent).toEqual("Anything else?");
        });
        it("Tab inserts spaces when tabToSpaceCount is set, and fires input", () => {
            const { input: textarea } = FormBuilder.createTextAreaContainer({ label: "Code", tabToSpaceCount: 4 });
            document.body.append(textarea);
            try {
                textarea.value = "ab";
                textarea.setSelectionRange(1, 1);
                let inputEvents = 0;
                textarea.addEventListener("input", () => inputEvents++);
                const event = new KeyboardEvent("keydown", { key: "Tab", cancelable: true });
                textarea.dispatchEvent(event);
                expect(textarea.value).toEqual("a    b");
                expect(event.defaultPrevented).toBe(true);
                expect(inputEvents).toBe(1);
            } finally {
                textarea.remove();
            }
        });
        it("Shift+Tab is left alone", () => {
            const { input: textarea } = FormBuilder.createTextAreaContainer({ label: "Code", tabToSpaceCount: 4 });
            const event = new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, cancelable: true });
            textarea.dispatchEvent(event);
            expect(event.defaultPrevented).toBe(false);
        });
        it("an out-of-range tabToSpaceCount throws", () => {
            expect(() => FormBuilder.createTextAreaContainer({ label: "Code", tabToSpaceCount: -1 }))
                .toThrowError(`FormBuilder: "tabToSpaceCount" must be a whole number from 0 to 16.`);
        });
    });

    describe("createFormLine", () => {
        it("routes a textarea to createTextAreaContainer", () => {
            expect(FormBuilder.createFormLine({ type: "textarea", label: "Notes" }).container.classList.contains("textarea-view")).toBe(true);
        });
        it("routes everything else to createInputContainer", () => {
            expect(FormBuilder.createFormLine({ type: "email", label: "Email" }).input.type).toEqual("email");
        });
        it("defaults to a text field", () => {
            expect(FormBuilder.createFormLine({ label: "Name" }).type).toEqual("text");
        });
        it("adds the formLine class", () => {
            expect(FormBuilder.createFormLine({ label: "Name" }).container.classList.contains("formLine")).toBe(true);
        });
        it("fullWidthInput adds the fullWidth class", () => {
            expect(FormBuilder.createFormLine({ label: "Name", fullWidthInput: true }).input.classList.contains("fullWidth")).toBe(true);
        });
        it("an option for the other kind of field names the field type", () => {
            expect(() => FormBuilder.createFormLine({ label: "Name", tabToSpaceCount: 2 }))
                .toThrowError(`FormBuilder: option(s) "tabToSpaceCount" aren't supported for a "text" field.`);
            expect(() => FormBuilder.createFormLine({ type: "textarea", label: "Notes", min: 1 }))
                .toThrowError(`FormBuilder: option(s) "min" aren't supported for a "textarea" field.`);
        });
        it("a misspelled option throws", () => {
            expect(() => FormBuilder.createFormLine({ label: "Name", requird: true })).toThrowError(/unknown option\(s\) "requird" for createFormLine\(\)/);
        });
        it("registers the field once", () => {
            FormBuilder.createFormLine({ label: "Name" });
            expect(FormBuilder.getInputContainers().length).toBe(1);
        });
    });

    describe("registry", () => {
        it("keeps fields in creation order", () => {
            const first = FormBuilder.createFormLine({ label: "A" });
            const second = FormBuilder.createFormLine({ label: "B" });
            expect(FormBuilder.getInputContainers()).toEqual([first, second]);
        });
        it("filters by metadata", () => {
            FormBuilder.createFormLine({ label: "A", metadata: { ajaxParamName: "a" } });
            const second = FormBuilder.createFormLine({ label: "B", metadata: { ajaxParamName: "b" } });
            expect(FormBuilder.getInputContainers({ metadata: m => m?.ajaxParamName === "b" })).toEqual([second]);
        });
        it("a non-function filter throws", () => {
            expect(() => FormBuilder.getInputContainers({ metadata: "b" })).toThrowError(`FormBuilder: the "metadata" filter, if provided, must be a function.`);
        });
        it("returns a copy", () => {
            FormBuilder.createFormLine({ label: "A" });
            FormBuilder.getInputContainers().pop();
            expect(FormBuilder.getInputContainers().length).toBe(1);
        });
        it("clearInputContainers empties it", () => {
            FormBuilder.createFormLine({ label: "A" });
            FormBuilder.clearInputContainers();
            expect(FormBuilder.getInputContainers()).toEqual([]);
        });
    });

    describe("end to end with FormValidator", () => {
        it("a built form validates and collects its data", () => {
            const name = FormBuilder.createFormLine({ label: "Name", required: true, metadata: { ajaxParamName: "name" } });
            const age = FormBuilder.createFormLine({ type: "number", label: "Age", min: 18, stepValue: "any", metadata: { ajaxParamName: "age" } });
            const born = FormBuilder.createFormLine({ type: "date", label: "Born", metadata: { ajaxParamName: "born" } });
            const terms = FormBuilder.createFormLine({ type: "checkbox", label: "I agree", required: true, metadata: { ajaxParamName: "terms" } });
            const formValidator = new FormValidator(FormBuilder.getInputContainers());

            let outcome = formValidator.validate();
            expect(outcome.isValid).toBe(false);
            expect(outcome.errors.map(error => error.fullMessage)).toEqual([
                `"Name" is a required field`,
                `"I agree" is a required field`
            ]);
            expect(name.errorMessageContainer.textContent).toEqual(`"Name" is a required field`);

            name.input.value = "Ada";
            age.input.value = "36.5";
            born.input.value = "1990-12-10";
            terms.input.checked = true;
            outcome = formValidator.validate();
            expect(outcome.isValid).toBe(true);
            expect(outcome.data.name).toEqual("Ada");
            expect(outcome.data.age).toBe(36.5);
            expect(outcome.data.born).toEqual("1990-12-10");
            expect(outcome.data.terms).toBe(true);
            expect(name.errorMessageContainer.textContent).toEqual("");
        });
        it("a decimal in a number field without a step is rejected, as the browser does", () => {
            const price = FormBuilder.createFormLine({ type: "number", label: "Price" });
            price.input.value = "36.5";
            expect(new FormValidator([price]).validate().errors.map(error => error.message)).toEqual([`does not match the allowed step of "1"`]);
        });
        it("a decimal is accepted with stepValue 'any'", () => {
            const price = FormBuilder.createFormLine({ type: "number", label: "Price", stepValue: "any" });
            price.input.value = "36.5";
            expect(new FormValidator([price]).validate().data).toEqual({});
            expect(new FormValidator([price]).validate().isValid).toBe(true);
        });
        it("a number below min is reported", () => {
            const age = FormBuilder.createFormLine({ type: "number", label: "Age", min: 18 });
            age.input.value = "0";
            const { errors } = new FormValidator([age]).validate();
            expect(errors.map(error => error.message)).toEqual([`does not meet the minimum value of "18"`]);
        });
    });

    describe("hidden fields", () => {
        it("have no label element or error area, in a hidden wrapper", () => {
            const formElement = FormBuilder.createFormLine({ type: "hidden", label: "Token", value: "abc" });
            expect(formElement.labelElement).toBeNull();
            expect(formElement.errorMessageContainer).toBeNull();
            expect(formElement.container.hidden).toBe(true);
            expect([...formElement.container.children]).toEqual([formElement.input]);
        });
        it("can't be required (hidden inputs aren't validated)", () => {
            expect(() => FormBuilder.createFormLine({ type: "hidden", label: "Token", required: true }))
                .toThrowError(`FormElement: "validation.required" has no effect on a "hidden" input — hidden inputs aren't validated.`);
        });
        it("keep their label", () => {
            expect(FormBuilder.createFormLine({ type: "hidden", label: "Token" }).label).toEqual("Token");
        });
        it("are registered and submitted", () => {
            FormBuilder.createFormLine({ type: "hidden", label: "Token", value: "abc", metadata: { ajaxParamName: "token" } });
            expect(new FormValidator(FormBuilder.getInputContainers()).validate().data).toEqual({ token: "abc" });
        });
        it("don't take info", () => {
            expect(() => FormBuilder.createFormLine({ type: "hidden", label: "Token", info: "x" }))
                .toThrowError(`FormBuilder: "info" is not supported for a "hidden" field.`);
        });
    });

    describe("file, range, and color", () => {
        it("a file field can't be built", () => {
            expect(() => FormBuilder.createFormLine({ type: "file", label: "Upload" })).toThrowError(/FormBuilder: "type" must be one of:/);
        });
        it("a required range throws", () => {
            expect(() => FormBuilder.createFormLine({ type: "range", label: "Volume", required: true }))
                .toThrowError(`FormElement: "validation.required" has no effect on a "range" input — it always has a value.`);
        });
        it("a required color throws", () => {
            expect(() => FormBuilder.createFormLine({ type: "color", label: "Color", required: true }))
                .toThrowError(`FormElement: "validation.required" has no effect on a "color" input — it always has a value.`);
        });
    });

    describe("dataList items must suit the field", () => {
        it("words on a number field throw", () => {
            expect(() => FormBuilder.createInputWithLabel({ type: "number", label: "Qty", dataList: ["abc", "many"] }))
                .toThrowError(`FormBuilder: every "dataList" item must be a number to match the field.`);
        });
        it("numbers on a number field are fine", () => {
            const { dataListElement } = FormBuilder.createInputWithLabel({ type: "number", label: "Qty", stepValue: 0.5, dataList: [1, 2.5] });
            expect([...dataListElement.children].map(option => option.value)).toEqual(["1", "2.5"]);
        });
        it("Dates on a date field are formatted for the picker", () => {
            const { dataListElement } = FormBuilder.createInputWithLabel({ type: "date", label: "When", dataList: [new Date(2026, 0, 2)] });
            expect(dataListElement.children[0].value).toEqual("2026-01-02");
        });
        it("numbers on a text field throw", () => {
            expect(() => FormBuilder.createInputWithLabel({ label: "Name", dataList: [1] }))
                .toThrowError(`FormBuilder: every "dataList" item must be a string to match the field.`);
        });
    });

    describe("info elements", () => {
        it("reusing one element for a second field throws instead of moving it", () => {
            const help = document.createElement("p");
            help.textContent = "help";
            const first = FormBuilder.createFormLine({ label: "A", info: help });
            expect(() => FormBuilder.createFormLine({ label: "B", info: help }))
                .toThrowError(`FormBuilder: the "info" element is already in use elsewhere — pass a separate element for each field (e.g. info.cloneNode(true)).`);
            expect(first.container.querySelector(".infoRegion").contains(help)).toBe(true);
        });
        it("a clone works for the second field", () => {
            const help = document.createElement("p");
            help.textContent = "help";
            FormBuilder.createFormLine({ label: "A", info: help });
            expect(() => FormBuilder.createFormLine({ label: "B", info: help.cloneNode(true) })).not.toThrow();
        });
        it("an element from an iframe is accepted", () => {
            const iframe = document.createElement("iframe");
            document.body.append(iframe);
            const help = iframe.contentDocument.createElement("p");
            help.textContent = "from the iframe";
            try {
                const { container } = FormBuilder.createFormLine({ label: "A", info: help });
                expect(container.querySelector(".infoRegion").textContent).toEqual("from the iframe");
            } finally {
                iframe.remove();
            }
        });
        it("a fake element object is still rejected", () => {
            expect(() => FormBuilder.createFormLine({ label: "A", info: { nodeType: 1 } }))
                .toThrowError(`FormBuilder: "info", if provided, must be a non-empty string or an element.`);
        });
    });

    describe("textarea expand buttons name their field", () => {
        it("each button's accessible name includes the label", () => {
            const notes = FormBuilder.createFormLine({ type: "textarea", label: "Notes" });
            const bio = FormBuilder.createFormLine({ type: "textarea", label: "Bio" });
            const names = [notes, bio].map(field => field.container.querySelector("button[aria-pressed]").getAttribute("aria-label"));
            expect(names).toEqual(["Expand Notes", "Expand Bio"]);
        });
        it("the name follows the state", () => {
            const { container } = FormBuilder.createFormLine({ type: "textarea", label: "Notes" });
            const button = container.querySelector("button[aria-pressed]");
            button.click();
            expect(button.getAttribute("aria-label")).toEqual("Minimize Notes");
        });
    });

    describe("checkbox lines", () => {
        it("get the checkboxLine class", () => {
            const { container } = FormBuilder.createFormLine({ type: "checkbox", label: "Agree" });
            expect(container.classList.contains("checkboxLine")).toBe(true);
            expect(container.classList.contains("formLine")).toBe(true);
        });
        it("other lines don't", () => {
            expect(FormBuilder.createFormLine({ label: "Name" }).container.classList.contains("checkboxLine")).toBe(false);
        });
    });

    describe("initial values the browser would replace", () => {
        const build = (config) => FormBuilder.createInputWithLabel({ label: "Field", ...config });
        it("a time it can't parse throws instead of becoming empty", () => {
            expect(() => build({ type: "time", value: "noon" })).toThrowError(`FormBuilder: "value" "noon" isn't a valid value for a "time" field.`);
        });
        it("a valid time is kept", () => {
            expect(build({ type: "time", value: "12:00" }).input.value).toEqual("12:00");
        });
        it("a range value above max throws instead of being clamped", () => {
            expect(() => build({ type: "range", value: 150, max: 100 })).toThrowError(`FormBuilder: "value" "150" isn't a valid value for a "range" field.`);
        });
        it("a range value outside the default 0-100 throws", () => {
            expect(() => build({ type: "range", value: 500 })).toThrowError(`FormBuilder: "value" "500" isn't a valid value for a "range" field.`);
        });
        it("a range value inside the range is kept", () => {
            expect(build({ type: "range", value: 30 }).input.value).toEqual("30");
        });
        it("a range value off the step throws instead of being rounded", () => {
            expect(() => build({ type: "range", value: 2.5 })).toThrowError(`FormBuilder: "value" "2.5" isn't a valid value for a "range" field.`);
        });
        it("a color that isn't #rrggbb throws instead of becoming #000000", () => {
            expect(() => build({ type: "color", value: "notacolor" })).toThrowError(`FormBuilder: "value" "notacolor" isn't a valid value for a "color" field.`);
        });
        it("a named color throws too (only some browsers convert names)", () => {
            expect(() => build({ type: "color", value: "red" })).toThrowError(`FormBuilder: "value" "red" isn't a valid value for a "color" field.`);
        });
        it("a #rrggbb color is kept", () => {
            expect(build({ type: "color", value: "#336699" }).input.value).toEqual("#336699");
        });
        it("an email value that isn't an email address throws", () => {
            expect(() => build({ type: "email", value: "not an email" })).toThrowError(`FormBuilder: "value" "not an email" isn't a valid value for a "email" field.`);
        });
        it("a url value that isn't a URL throws", () => {
            expect(() => build({ type: "url", value: "nope" })).toThrowError(`FormBuilder: "value" "nope" isn't a valid value for a "url" field.`);
        });
        it("a month value it can't parse throws", () => {
            expect(() => build({ type: "month", value: "June" })).toThrowError(`FormBuilder: "value" "June" isn't a valid value for a "month" field.`);
        });
    });

    describe("min/max on time, month, and week fields", () => {
        const build = (config) => FormBuilder.createFormLine({ label: "When", ...config });
        const errorsFor = (formElement, value) => {
            formElement.input.value = value;
            return new FormValidator([formElement]).validate().errors.map(error => error.message);
        };

        it("a time range sets the attributes", () => {
            const { input } = build({ type: "time", min: "09:00", max: "17:00" });
            expect([input.min, input.max]).toEqual(["09:00", "17:00"]);
        });
        it("a time before min is reported", () => {
            expect(errorsFor(build({ type: "time", min: "09:00" }), "08:30")).toEqual([`does not meet the minimum value of "09:00"`]);
        });
        it("a time after max is reported", () => {
            expect(errorsFor(build({ type: "time", max: "17:00" }), "18:00")).toEqual([`exceeds the maximum value of "17:00"`]);
        });
        it("a time inside the range is valid", () => {
            expect(errorsFor(build({ type: "time", min: "09:00", max: "17:00" }), "12:00")).toEqual([]);
        });
        it("an overnight time range (min after max) is allowed", () => {
            const field = build({ type: "time", min: "22:00", max: "06:00" });
            expect(errorsFor(field, "23:30")).toEqual([]);
            expect(errorsFor(field, "12:00").length).toBeGreaterThan(0);
        });
        it("a month range works", () => {
            const field = build({ type: "month", min: "2026-01", max: "2026-06" });
            expect(errorsFor(field, "2026-07")).toEqual([`exceeds the maximum value of "2026-06"`]);
            expect(errorsFor(field, "2026-03")).toEqual([]);
        });
        it("a week range works", () => {
            expect(errorsFor(build({ type: "week", min: "2026-W10" }), "2026-W05")).toEqual([`does not meet the minimum value of "2026-W10"`]);
        });
        it("a month min after max throws", () => {
            expect(() => build({ type: "month", min: "2026-06", max: "2026-01" })).toThrowError(`FormBuilder: "min" must not be after "max".`);
        });
        it("a bound in the wrong format throws, with an example", () => {
            expect(() => build({ type: "time", min: "9am" })).toThrowError(`FormBuilder: "min" for a "time" field must be text like "09:30".`);
            expect(() => build({ type: "week", max: "2026-23" })).toThrowError(`FormBuilder: "max" for a "week" field must be text like "2026-W23".`);
        });
        it("a well-formed but impossible month throws", () => {
            expect(() => build({ type: "month", min: "2026-13" })).toThrowError(`FormBuilder: "min" for a "month" field must be text like "2026-06".`);
        });
        it("a numeric bound on a time field throws", () => {
            expect(() => build({ type: "time", min: 9 })).toThrowError(`FormBuilder: "min" for a "time" field must be text like "09:30".`);
        });
        it("number fields still keep min/max in their FieldValidation, with no duplicate error", () => {
            const field = build({ type: "number", min: 5 });
            expect(field.validation.min).toBe(5);
            expect(errorsFor(field, "1")).toEqual([`does not meet the minimum value of "5"`]);
        });
    });

    describe("min/max attributes on hand-written markup", () => {
        it("are checked even without FieldValidation bounds", () => {
            const input = document.createElement("input");
            input.type = "date";
            input.min = "2026-01-01";
            input.value = "2025-12-31";
            const errors = new FormValidator([new FormElement({ input, label: "Start" })]).validate().errors;
            expect(errors.map(error => error.message)).toEqual([`does not meet the minimum value of "2026-01-01"`]);
        });
    });

    describe("info region and page CSS", () => {
        let style;
        beforeEach(() => {
            style = document.createElement("style");
            style.textContent = ".infoRegion { display: block; }";
            document.head.append(style);
        });
        afterEach(() => {
            style.remove();
        });

        it("stays hidden until the button is clicked, even if page CSS sets display", () => {
            const { container } = FormBuilder.createFormLine({ label: "X", info: "help" });
            document.body.append(container);
            try {
                const region = container.querySelector(".infoRegion");
                expect(region.getClientRects().length).toBe(0);
                container.querySelector("button").click();
                expect(region.getClientRects().length).toBeGreaterThan(0);
                container.querySelector("button").click();
                expect(region.getClientRects().length).toBe(0);
            } finally {
                container.remove();
            }
        });
    });

    describe("pattern attribute - only when the browser can use it", () => {
        it("a pattern the browser's stricter syntax rejects isn't set as an attribute", () => {
            const { input } = FormBuilder.createInputWithLabel({ label: "User", pattern: "[\\w.-]+" });
            expect(input.hasAttribute("pattern")).toBe(false);
        });
        it("...but FormValidator still checks it", () => {
            const formElement = FormBuilder.createFormLine({ label: "User", pattern: "[\\w.-]+" });
            formElement.input.value = "a b";
            expect(new FormValidator([formElement]).validate().errors.map(error => error.message)).toEqual(["does not match the required format"]);
            formElement.input.value = "a.b-c";
            expect(new FormValidator([formElement]).validate().isValid).toBe(true);
        });
        it("a pattern the browser accepts is still set", () => {
            const { input } = FormBuilder.createInputWithLabel({ label: "User", pattern: "[\\w.\\-]+" });
            expect(input.pattern).toEqual("[\\w.\\-]+");
            input.value = "a b";
            expect(input.checkValidity()).toBe(false);
        });
    });

    describe("values FormBuilder puts in a field must pass the field's own rules", () => {
        const build = (config) => FormBuilder.createFormLine({ label: "Field", ...config });

        it("an initial value shorter than minChars throws", () => {
            expect(() => build({ value: "ab", minChars: 3 }))
                .toThrowError(`FormBuilder: "value" "ab" breaks the field's own rules: does not meet the minimum length of "3".`);
        });
        it("an initial number above max throws", () => {
            expect(() => build({ type: "number", value: 50, max: 10 }))
                .toThrowError(`FormBuilder: "value" "50" breaks the field's own rules: exceeds the maximum value of "10".`);
        });
        it("an initial value not in options throws", () => {
            expect(() => build({ value: "XL", options: ["S", "M"] }))
                .toThrowError(`FormBuilder: "value" "XL" breaks the field's own rules: must be one of the allowed options.`);
        });
        it("an initial decimal on a step-1 number field throws", () => {
            expect(() => build({ type: "number", value: 1.5 }))
                .toThrowError(`FormBuilder: "value" "1.5" breaks the field's own rules: does not match the allowed step of "1".`);
        });
        it("an initial time outside a time range throws", () => {
            expect(() => build({ type: "time", value: "08:00", min: "09:00" }))
                .toThrowError(`FormBuilder: "value" "08:00" breaks the field's own rules: does not meet the minimum value of "09:00".`);
        });
        it("an initial value that passes is fine, including on a read-only field", () => {
            expect(() => build({ value: "abc", minChars: 3, readonly: true })).not.toThrow();
        });
        it("a read-only field's initial value is still checked (it's the only value it will have)", () => {
            expect(() => build({ value: "ab", minChars: 3, readonly: true })).toThrowError(/breaks the field's own rules/);
        });
        it("a dataList suggestion shorter than minChars throws", () => {
            expect(() => build({ minChars: 3, dataList: ["abc", "a"] }))
                .toThrowError(`FormBuilder: "dataList" item "a" breaks the field's own rules: does not meet the minimum length of "3".`);
        });
        it("a dataList suggestion outside the number range throws", () => {
            expect(() => build({ type: "number", max: 10, dataList: [5, 20] }))
                .toThrowError(`FormBuilder: "dataList" item "20" breaks the field's own rules: exceeds the maximum value of "10".`);
        });
        it("a decimal option on a step-1 number field throws", () => {
            expect(() => build({ type: "number", options: [1.5, 2] }))
                .toThrowError(`FormBuilder: option "1.5" can never be valid on this field: does not match the allowed step of "1".`);
        });
        it("decimal options are fine with a matching step", () => {
            expect(() => build({ type: "number", stepValue: 0.5, options: [1.5, 2] })).not.toThrow();
        });
        it("a select's options aren't checked against a step (a select has none)", () => {
            expect(() => build({ type: "select", expectedType: "number", options: [1.5, 2] })).not.toThrow();
        });
        it("a customValidator isn't run on values FormBuilder checks", () => {
            let calls = 0;
            build({ value: "abc", dataList: ["x", "y"], customValidator: () => { calls++; return []; } });
            expect(calls).toBe(0);
        });
    });

    describe("required can't be combined with readonly or disabled", () => {
        it("required + readonly throws", () => {
            expect(() => FormBuilder.createFormLine({ label: "Account", required: true, readonly: true }))
                .toThrowError(`FormBuilder: a field can't be both "required" and "readonly" — the user couldn't fill it in, so it would never be checked.`);
        });
        it("required + disabled throws", () => {
            expect(() => FormBuilder.createFormLine({ label: "Locked", required: true, disabled: true }))
                .toThrowError(`FormBuilder: a field can't be both "required" and "disabled" — the user couldn't fill it in, so it would never be checked.`);
        });
        it("readonly or disabled on their own are fine", () => {
            expect(() => FormBuilder.createFormLine({ label: "Account", readonly: true, value: "ACC-1" })).not.toThrow();
            expect(() => FormBuilder.createFormLine({ label: "Locked", disabled: true })).not.toThrow();
        });
    });

    describe("createForm - a form with its own field list", () => {
        it("returns a FormBuilderForm", () => {
            expect(FormBuilder.createForm() instanceof FormBuilderForm).toBe(true);
        });
        it("each form keeps its own fields", () => {
            const login = FormBuilder.createForm();
            const signup = FormBuilder.createForm();
            const username = login.createFormLine({ label: "Username" });
            const email = signup.createFormLine({ type: "email", label: "Email" });
            expect(login.getInputContainers()).toEqual([username]);
            expect(signup.getInputContainers()).toEqual([email]);
        });
        it("a form's fields don't go into the shared registry", () => {
            FormBuilder.createForm().createFormLine({ label: "Username" });
            expect(FormBuilder.getInputContainers()).toEqual([]);
        });
        it("static builders still use the shared registry, unaffected by forms", () => {
            const shared = FormBuilder.createFormLine({ label: "Shared" });
            const form = FormBuilder.createForm();
            form.createFormLine({ label: "In form" });
            expect(FormBuilder.getInputContainers()).toEqual([shared]);
            expect(form.getInputContainers().length).toBe(1);
        });
        it("all three builders add to the form", () => {
            const form = FormBuilder.createForm();
            form.createFormLine({ label: "A" });
            form.createInputContainer({ label: "B" });
            form.createTextAreaContainer({ label: "C" });
            expect(form.getInputContainers().map(field => field.label)).toEqual(["A", "B", "C"]);
        });
        it("builds fields exactly like the static methods (same classes, same checks)", () => {
            const form = FormBuilder.createForm();
            const field = form.createFormLine({ type: "checkbox", label: "Agree" });
            expect(field.container.classList.contains("formLine")).toBe(true);
            expect(field.container.classList.contains("checkboxLine")).toBe(true);
            expect(() => form.createFormLine({ label: "Bad", requird: true })).toThrowError(/unknown option\(s\) "requird" for createFormLine\(\)/);
        });
        it("a field that fails to build isn't added", () => {
            const form = FormBuilder.createForm();
            expect(() => form.createFormLine({ label: "Code", value: "ab", minChars: 3 })).toThrow();
            expect(form.getInputContainers()).toEqual([]);
        });
        it("getInputContainers filters by metadata and returns a copy", () => {
            const form = FormBuilder.createForm();
            form.createFormLine({ label: "A", metadata: { ajaxParamName: "a" } });
            const second = form.createFormLine({ label: "B", metadata: { ajaxParamName: "b" } });
            expect(form.getInputContainers({ metadata: m => m?.ajaxParamName === "b" })).toEqual([second]);
            form.getInputContainers().pop();
            expect(form.getInputContainers().length).toBe(2);
            expect(() => form.getInputContainers({ metadata: "b" })).toThrowError(`FormBuilder: the "metadata" filter, if provided, must be a function.`);
        });
        it("clearInputContainers empties only that form", () => {
            const first = FormBuilder.createForm();
            const second = FormBuilder.createForm();
            first.createFormLine({ label: "A" });
            second.createFormLine({ label: "B" });
            first.clearInputContainers();
            expect(first.getInputContainers()).toEqual([]);
            expect(second.getInputContainers().length).toBe(1);
        });
        it("validate checks only that form's fields", () => {
            const login = FormBuilder.createForm();
            const signup = FormBuilder.createForm();
            const username = login.createFormLine({ label: "Username", required: true, metadata: { ajaxParamName: "username" } });
            signup.createFormLine({ label: "Email", required: true });
            username.input.value = "ada";
            const outcome = login.validate();
            expect(outcome.isValid).toBe(true);
            expect(outcome.data).toEqual({ username: "ada" });
            expect(signup.validate().isValid).toBe(false);
        });
        it("validate always uses the current fields", () => {
            const form = FormBuilder.createForm();
            form.createFormLine({ label: "A" });
            expect(form.validate().results.length).toBe(1);
            form.createFormLine({ label: "B" });
            expect(form.validate().results.length).toBe(2);
        });
        it("validate passes options through", () => {
            const form = FormBuilder.createForm();
            form.createFormLine({ label: "Nom", required: true });
            expect(form.validate({ messages: { required: "est obligatoire" } }).errors[0].fullMessage).toEqual(`"Nom" est obligatoire`);
        });
        it("createValidator returns a FormValidator for the current fields", () => {
            const form = FormBuilder.createForm();
            const field = form.createFormLine({ label: "A" });
            const formValidator = form.createValidator();
            expect(formValidator instanceof FormValidator).toBe(true);
            expect(formValidator.getInputContainers()).toEqual([field]);
            form.createFormLine({ label: "B" });
            expect(formValidator.getInputContainers().length).toBe(1);
        });
        it("new FormBuilderForm() works too, but takes no arguments", () => {
            expect(new FormBuilderForm().getInputContainers()).toEqual([]);
            expect(() => new FormBuilderForm({})).toThrowError(`FormBuilderForm: takes no arguments — use FormBuilder.createForm().`);
        });
        it("forms, the class, and its prototype are frozen", () => {
            const form = FormBuilder.createForm();
            expect(Object.isFrozen(form)).toBe(true);
            expect(() => { form.extra = 1; }).toThrowError(TypeError);
            expect(Object.isFrozen(FormBuilderForm)).toBe(true);
            expect(Object.isFrozen(FormBuilderForm.prototype)).toBe(true);
        });
        it("FormBuilder's private builders aren't reachable from outside", () => {
            expect(Object.getOwnPropertyNames(FormBuilder).some(name => /build/i.test(name))).toBe(false);
        });
    });

    describe("time, month, and week - checked in code, the same in every browser", () => {
        // Simulates a browser that doesn't implement the type (Firefox for
        // month/week): the field is a plain text box, so its value is
        // whatever was typed, and the browser never flags it.
        function unimplemented(formElement, typedText) {
            Object.defineProperty(formElement.input, "value", { get: () => typedText, configurable: true });
            Object.defineProperty(formElement.input, "validity", {
                get: () => ({ badInput: false, typeMismatch: false, stepMismatch: false, rangeUnderflow: false, rangeOverflow: false, patternMismatch: false }),
                configurable: true
            });
            return formElement;
        }
        const errorsFor = (formElement) => FormValidator.validateSingleInput({ inputContainer: formElement }).errors.map(error => error.message);

        it("text typed into a month box that isn't a month is an error", () => {
            const field = unimplemented(FormBuilder.createFormLine({ type: "month", label: "Start" }), "June");
            expect(errorsFor(field)).toEqual(["does not match the required format"]);
        });
        it("a month after max is an error even when the browser doesn't flag it", () => {
            const field = unimplemented(FormBuilder.createFormLine({ type: "month", label: "Start", max: "2026-06" }), "2026-07");
            expect(errorsFor(field)).toEqual([`exceeds the maximum value of "2026-06"`]);
        });
        it("a week before min is an error even when the browser doesn't flag it", () => {
            const field = unimplemented(FormBuilder.createFormLine({ type: "week", label: "Week", min: "2026-W10" }), "2026-W05");
            expect(errorsFor(field)).toEqual([`does not meet the minimum value of "2026-W10"`]);
        });
        it("a valid month inside the range passes", () => {
            const field = unimplemented(FormBuilder.createFormLine({ type: "month", label: "Start", min: "2026-01", max: "2026-06" }), "2026-03");
            expect(errorsFor(field)).toEqual([]);
        });
        it("a time outside an overnight range is one error, inside it is fine", () => {
            const field = FormBuilder.createFormLine({ type: "time", label: "Shift", min: "22:00", max: "06:00" });
            expect(errorsFor(unimplemented(field, "12:00"))).toEqual([`does not meet the minimum value of "22:00"`]);
            expect(errorsFor(unimplemented(field, "02:00"))).toEqual([]);
        });
        it("week 53 is valid only in years that have one", () => {
            expect(() => FormBuilder.createFormLine({ type: "week", label: "W", min: "2026-W53" })).not.toThrow();
            expect(() => FormBuilder.createFormLine({ type: "week", label: "W", min: "2025-W53" }))
                .toThrowError(`FormBuilder: "min" for a "week" field must be text like "2026-W23".`);
        });
        it("an impossible time bound throws", () => {
            expect(() => FormBuilder.createFormLine({ type: "time", label: "T", max: "24:00" }))
                .toThrowError(`FormBuilder: "max" for a "time" field must be text like "09:30".`);
        });
        it("month min/max order is compared as months, not text", () => {
            expect(() => FormBuilder.createFormLine({ type: "month", label: "M", min: "2026-06", max: "10000-01" })).not.toThrow();
        });
        it("an initial week value that doesn't exist throws", () => {
            expect(() => FormBuilder.createFormLine({ type: "week", label: "W", value: "2025-W53" }))
                .toThrowError(`FormBuilder: "value" "2025-W53" isn't a valid value for a "week" field.`);
        });
    });
});
