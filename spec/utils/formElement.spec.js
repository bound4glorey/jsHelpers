describe("FormElement", () => {

    describe("constructor", () => {
        let testElementConfig;
        beforeEach(() => {
            testElementConfig = { input: document.createElement("input"), type: "text" };
        });

        // --- pins down exactly what "container must be an object" rejects
        // now that the check is objectType + !Array.isArray, not
        // plainObjectType. Dates/RegExps/Maps/elements/class instances are
        // NOT rejected by this specific check anymore — they fall through
        // to the "input is required" error instead, since they don't have
        // an .input property. This distinction is easy to silently break
        // in a future refactor without a test like this. ---
        describe("top-level shape — exact message for each non-object-config case", () => {
            it("string gets the config-shape error", () => {
                expect(() => new FormElement("test"))
                    .toThrowError(`FormElement: only accepts a configuration object.`);
            });
            it("array gets the config-shape error", () => {
                expect(() => new FormElement([]))
                    .toThrowError(`FormElement: only accepts a configuration object.`);
            });
            it("Date gets the input-required error, not the config-shape error", () => {
                expect(() => new FormElement(new Date()))
                    .toThrowError(`FormElement: "input" is required and must be an HTMLElement.`);
            });
            it("a real element gets the input-required error, not the config-shape error", () => {
                expect(() => new FormElement(document.createElement("input")))
                    .toThrowError(`FormElement: "input" is required and must be an HTMLElement.`);
            });
            it("a custom class instance gets the input-required error, not the config-shape error", () => {
                class Foo { }
                expect(() => new FormElement(new Foo()))
                    .toThrowError(`FormElement: "input" is required and must be an HTMLElement.`);
            });
        });
 
        // --- type auto-detection from the input element itself ---
        describe("type - auto-detected when omitted", () => {
            it("textarea", () => {
                const el = new FormElement({ input: document.createElement("textarea") });
                expect(el.type).toEqual("textarea");
            });
            it("select", () => {
                const el = new FormElement({ input: document.createElement("select") });
                expect(el.type).toEqual("select");
            });
            it("input with an explicit .type falls back to it", () => {
                const input = document.createElement("input");
                input.type = "email";
                const el = new FormElement({ input });
                expect(el.type).toEqual("email");
            });
        });
 
        // --- label fallback chain ---
        describe("label - fallback chain when omitted", () => {
            it("falls back to labelElement's text", () => {
                const labelElement = document.createElement("label");
                labelElement.textContent = "  From Label  ";
                const el = new FormElement({ input: document.createElement("input"), labelElement });
                expect(el.label).toEqual("From Label");
            });
            it("falls back to aria-label when there is no labelElement", () => {
                const input = document.createElement("input");
                input.getAttribute = (attr) => attr === "aria-label" ? "From Aria" : null;
                const el = new FormElement({ input });
                expect(el.label).toEqual("From Aria");
            });
            it("falls back to name when there is no labelElement/aria-label", () => {
                const input = document.createElement("input");
                input.name = "from_name";
                const el = new FormElement({ input });
                expect(el.label).toEqual("from_name");
            });
            it("falls back to id when nothing else is available", () => {
                const input = document.createElement("input");
                input.id = "from_id";
                const el = new FormElement({ input });
                expect(el.label).toEqual("from_id");
            });
            it("is null when nothing at all is available", () => {
                const el = new FormElement({ input: document.createElement("input") });
                expect(el.label).toBeNull();
            });
        });
 
        // --- validation identity: a pre-built FieldValidation is reused,
        // not rebuilt, and omitting it produces a real default instance ---
        describe("validation - identity", () => {
            it("reuses the exact FieldValidation instance passed in", () => {
                const fv = new FieldValidation({ required: true });
                const el = new FormElement({ input: document.createElement("input"), validation: fv });
                expect(el.validation).toBe(fv);
            });
            it("omitting validation produces a real default FieldValidation, not null", () => {
                const el = new FormElement({ input: document.createElement("input") });
                expect(el.validation instanceof FieldValidation).toBe(true);
                expect(el.validation.required).toBe(false);
            });
        });
 
        // --- metadata: plainObjectType exclusions beyond what's already
        // tested (Date/array/element/function) ---
        describe("metadata - additional plainObjectType exclusions", () => {
            it("RegExp is rejected", () => {
                testElementConfig.metadata = /x/;
                expect(() => new FormElement(testElementConfig)).toThrowError(`FormElement: "metadata", if provided, must be an object.`);
            });
            it("Map is rejected", () => {
                testElementConfig.metadata = new Map();
                expect(() => new FormElement(testElementConfig)).toThrowError(`FormElement: "metadata", if provided, must be an object.`);
            });
            it("Set is rejected", () => {
                testElementConfig.metadata = new Set();
                expect(() => new FormElement(testElementConfig)).toThrowError(`FormElement: "metadata", if provided, must be an object.`);
            });
            it("a custom class instance is rejected", () => {
                class Foo { }
                testElementConfig.metadata = new Foo();
                expect(() => new FormElement(testElementConfig)).toThrowError(`FormElement: "metadata", if provided, must be an object.`);
            });
            it("Object.create(null) is accepted (no prototype, but still a plain object)", () => {
                testElementConfig.metadata = Object.create(null);
                expect(() => new FormElement(testElementConfig)).not.toThrow();
            });
        });
    
        describe("container must an object", () => {
            it("valid", () => {
                expect(() => new FormElement(testElementConfig)).not.toThrow();
            });
    
            let errorMessage = `FormElement: only accepts a configuration object.`;
    
            it("string", () => {
                expect(() => new FormElement("test")).toThrowError(errorMessage);
            });
            it("number", () => {
                expect(() => new FormElement(5)).toThrowError(errorMessage);
            });
            it("boolean", () => {
                expect(() => new FormElement(true)).toThrowError(errorMessage);
            });
            it("date", () => {
                expect(() => new FormElement(new Date())).toThrow();
            });
            it("object", () => {
                expect(() => new FormElement({})).toThrow();
            });
            it("array", () => {
                expect(() => new FormElement([])).toThrowError(errorMessage);
            });
            it("function", () => {
                expect(() => new FormElement(function () { })).toThrowError(errorMessage);
            });
            it("element", () => {
                expect(() => new FormElement(document.createElement("input"))).toThrow();
            });
    
            describe("Special", () => {
                it("No Params", () => {
                    expect(() => new FormElement()).toThrowError(`FormElement: only accepts 1 parameter.`);
                });
                it("2 Params", () => {
                    expect(() => new FormElement(1, 2)).toThrowError(`FormElement: only accepts 1 parameter.`);
                });
            });
        });
    
        describe("input - required", () => {
            let errorMessage = `FormElement: "input" is required and must be an HTMLElement.`;
            it("valid", () => {
                testElementConfig.input = document.createElement("input");
                expect(() => new FormElement(testElementConfig)).not.toThrow();
            });
    
            it("string", () => {
                testElementConfig.input = "test"
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("number", () => {
                testElementConfig.input = 5;
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("boolean", () => {
                testElementConfig.input = true;
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("date", () => {
                testElementConfig.input = new Date();
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("object", () => {
                testElementConfig.input = {};
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("array", () => {
                testElementConfig.input = [];
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("function", () => {
                testElementConfig.input = function () { };
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("element", () => {
                testElementConfig.input = document.createElement("input");
                expect(() => new FormElement(testElementConfig)).not.toThrow();
            });
        });
    
        describe("label - optional", () => {
            let errorMessage = `FormElement: "label", if provided, must be a non-empty string.`;
            it("valid", () => {
                testElementConfig.label = "test";
                expect(() => new FormElement(testElementConfig)).not.toThrow();
            });
    
            it("string", () => {
                testElementConfig.label = "test"
                expect(() => new FormElement(testElementConfig)).not.toThrow();
            });
            it("number", () => {
                testElementConfig.label = 5;
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("boolean", () => {
                testElementConfig.label = true;
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("date", () => {
                testElementConfig.label = new Date();
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("object", () => {
                testElementConfig.label = {};
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("array", () => {
                testElementConfig.label = [];
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("function", () => {
                testElementConfig.label = function () { };
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("element", () => {
                testElementConfig.label = document.createElement("label");
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
        });
    
        describe("labelElement - optional", () => {
            let errorMessage = `FormElement: "labelElement", if provided, must be an HTMLElement.`;
            it("valid", () => {
                testElementConfig.labelElement = document.createElement("label");
                expect(() => new FormElement(testElementConfig)).not.toThrow();
            });
    
            it("string", () => {
                testElementConfig.labelElement = "test"
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("number", () => {
                testElementConfig.labelElement = 5;
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("boolean", () => {
                testElementConfig.labelElement = true;
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("date", () => {
                testElementConfig.labelElement = new Date();
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("object", () => {
                testElementConfig.labelElement = {};
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("array", () => {
                testElementConfig.labelElement = [];
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("function", () => {
                testElementConfig.labelElement = function () { };
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("element", () => {
                testElementConfig.labelElement = document.createElement("label");
                expect(() => new FormElement(testElementConfig)).not.toThrow();
            });
        });
    
        describe("errorMessageContainer - optional", () => {
            let errorMessage = `FormElement: "errorMessageContainer", if provided, must be an HTMLElement.`;
            it("valid", () => {
                testElementConfig.errorMessageContainer = document.createElement("div");
                expect(() => new FormElement(testElementConfig)).not.toThrow();
            });
    
            it("string", () => {
                testElementConfig.errorMessageContainer = "test"
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("number", () => {
                testElementConfig.errorMessageContainer = 5;
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("boolean", () => {
                testElementConfig.errorMessageContainer = true;
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("date", () => {
                testElementConfig.errorMessageContainer = new Date();
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("object", () => {
                testElementConfig.errorMessageContainer = {};
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("array", () => {
                testElementConfig.errorMessageContainer = [];
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("function", () => {
                testElementConfig.errorMessageContainer = function () { };
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("element", () => {
                testElementConfig.errorMessageContainer = document.createElement("input");
                expect(() => new FormElement(testElementConfig)).not.toThrow();
            });
        });
    
        describe("container - optional", () => {
            let errorMessage = `FormElement: "container", if provided, must be an HTMLElement.`;
            it("valid", () => {
                testElementConfig.container = document.createElement("div");
                testElementConfig.container.append(testElementConfig.input);
                expect(() => new FormElement(testElementConfig)).not.toThrow();
            });
    
            it("string", () => {
                testElementConfig.container = "test"
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("number", () => {
                testElementConfig.container = 5;
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("boolean", () => {
                testElementConfig.container = true;
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("date", () => {
                testElementConfig.container = new Date();
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("object", () => {
                testElementConfig.container = {};
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("array", () => {
                testElementConfig.container = [];
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("function", () => {
                testElementConfig.container = function () { };
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("element", () => {
                testElementConfig.container = document.createElement("div");
                testElementConfig.container.append(testElementConfig.input);
                expect(() => new FormElement(testElementConfig)).not.toThrow();
            });
        });
    
        describe("type - required", () => {
            let errorMessage = `FormElement: "type" is required and must be one of: textarea, select, text, password, email, number, tel, url, search, date, datetime-local, month, week, time, color, checkbox, range, hidden.`;
            it("valid", () => {
                testElementConfig.type = "text";
                expect(() => new FormElement(testElementConfig)).not.toThrow();
            });
    
            it("string", () => {
                testElementConfig.type = "test"
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("number", () => {
                testElementConfig.type = 5;
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("boolean", () => {
                testElementConfig.type = true;
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("date", () => {
                testElementConfig.type = new Date();
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("object", () => {
                testElementConfig.type = {};
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("array", () => {
                testElementConfig.type = [];
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("function", () => {
                testElementConfig.type = function () { };
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("element", () => {
                testElementConfig.type = document.createElement("input");
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
        });
    
        describe("validation — required", () => {
            let errorMessage = `FormElement: "validation", if provided, must be a FieldValidation instance.`;
            it("valid", () => {
                testElementConfig.validation = new FieldValidation();
                expect(() => new FormElement(testElementConfig)).not.toThrow();
            });
    
            it("string", () => {
                testElementConfig.validation = "test"
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("number", () => {
                testElementConfig.validation = 5;
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("boolean", () => {
                testElementConfig.validation = true;
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("date", () => {
                testElementConfig.validation = new Date();
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("object", () => {
                testElementConfig.validation = {};
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("array", () => {
                testElementConfig.validation = [];
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("function", () => {
                testElementConfig.validation = function () { };
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("element", () => {
                testElementConfig.validation = document.createElement("input");
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
        });
    
        describe("metadata - optional", () => {
            let errorMessage = `FormElement: "metadata", if provided, must be an object.`;
            it("valid", () => {
                testElementConfig.metadata = {"test": 1};
                expect(() => new FormElement(testElementConfig)).not.toThrow();
            });
    
            it("string", () => {
                testElementConfig.metadata = "test"
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("number", () => {
                testElementConfig.metadata = 5;
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("boolean", () => {
                testElementConfig.metadata = true;
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("date", () => {//dates are objects
                testElementConfig.metadata = new Date();
                expect(() => new FormElement(testElementConfig)).toThrow();
            });
            it("object", () => {
                testElementConfig.metadata = {};
                expect(() => new FormElement(testElementConfig)).not.toThrow();
            });
            it("array", () => {
                testElementConfig.metadata = [];
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("function", () => {
                testElementConfig.metadata = function () { };
                expect(() => new FormElement(testElementConfig)).toThrowError(errorMessage);
            });
            it("element", () => {//elements are objects
                testElementConfig.metadata = document.createElement("input");
                expect(() => new FormElement(testElementConfig)).toThrow();
            });
        });
    });

    describe("getter functions", () => {
        describe("input", () => {
            it("match", () => {
                let testElement = document.createElement("input");
                let testElementClass = new FormElement({ input: testElement, type: "text" });
                expect(testElementClass.input).toBe(testElement);
            });

            it("no match", () => {
                let testElement = document.createElement("input");
                let testElementClass = new FormElement({ input: testElement, type: "text" });
                expect(testElementClass.input).not.toBe(document.createElement("input"));
            });
        });

        describe("label", () => {
            it("match", () => {
                let testElementClass = new FormElement({ input: document.createElement("input"), type: "text", label: "test" });
                expect(testElementClass.label).toEqual("test");
            });

            it("no match", () => {
                let testElementClass = new FormElement({ input: document.createElement("input"), type: "text", label: "test" });
                expect(testElementClass.label).not.toEqual("other");
            });
        });

        describe("labelElement", () => {
            it("match", () => {
                let testElement = document.createElement("label");
                let testElementClass = new FormElement({ input: document.createElement("input"), labelElement: testElement, type: "text" });
                expect(testElementClass.labelElement).toBe(testElement);
            });

            it("no match", () => {
                let testElement = document.createElement("label");
                let testElementClass = new FormElement({ input: document.createElement("input"), labelElement: testElement, type: "text" });
                expect(testElementClass.labelElement).not.toBe(document.createElement("label"));
            });
        });

        describe("errorMessageContainer", () => {
            it("match", () => {
                let testElement = document.createElement("div");
                let testElementClass = new FormElement({ input: document.createElement("input"), errorMessageContainer: testElement, type: "text" });
                expect(testElementClass.errorMessageContainer).toBe(testElement);
            });

            it("no match", () => {
                let testElement = document.createElement("div");
                let testElementClass = new FormElement({ input: document.createElement("input"), errorMessageContainer: testElement, type: "text" });
                expect(testElementClass.errorMessageContainer).not.toBe(document.createElement("div"));
            });
        });

        describe("container", () => {
            it("match", () => {
                let testElement = document.createElement("div");
                let testInput = document.createElement("input");
                testElement.append(testInput);
                let testElementClass = new FormElement({ input: testInput, container: testElement, type: "text" });
                expect(testElementClass.container).toBe(testElement);
            });

            it("no match", () => {
                let testElement = document.createElement("div");
                let testInput = document.createElement("input");
                testElement.append(testInput);
                let testElementClass = new FormElement({ input: testInput, container: testElement, type: "text" });
                expect(testElementClass.container).not.toBe(document.createElement("div"));
            });
        });

        describe("type", () => {
            it("match", () => {
                let testElementClass = new FormElement({ input: document.createElement("input"), type: "text" });
                expect(testElementClass.type).toEqual("text");
            });

            it("no match", () => {
                let testElementClass = new FormElement({ input: document.createElement("input"), type: "text" });
                expect(testElementClass.type).not.toEqual("string");
            });
        });

        describe("validation", () => {
            it("match", () => {
                let testSettings = new FieldValidation();
                let testElementClass = new FormElement({ input: document.createElement("input"), validation: testSettings, type: "text" });
                expect(testElementClass.validation).toBe(testSettings);
            });

            it("no match", () => {
                let testSettings = new FieldValidation();
                let testElementClass = new FormElement({ input: document.createElement("input"), validation: testSettings, type: "text" });
                expect(testElementClass.validation).not.toBe(new FieldValidation());
            });
        });

        describe("metadata", () => {
            it("match", () => {
                let testSettings = {"option": 1};
                let testElementClass = new FormElement({ input: document.createElement("input"), metadata: testSettings, type: "text" });
                expect(testElementClass.metadata).toEqual(testSettings);
            });

            it("no match", () => {
                let testSettings = {"option": 1};
                let testElementClass = new FormElement({ input: document.createElement("input"), metadata: testSettings, type: "text" });
                expect(testElementClass.metadata).not.toEqual({"option": 2});
            });
        });
    });

    describe("config shape", () => {
        it("null gets the config-shape error, not a raw TypeError", () => {
            expect(() => new FormElement(null)).toThrowError(`FormElement: only accepts a configuration object.`);
        });
        it("undefined gets the config-shape error, not a raw TypeError", () => {
            expect(() => new FormElement(undefined)).toThrowError(`FormElement: only accepts a configuration object.`);
        });
    });

    describe("element checks - real element nodes only", () => {
        it("a text node as input throws", () => {
            expect(() => new FormElement({ input: document.createTextNode("x"), type: "text" }))
                .toThrowError(`FormElement: "input" is required and must be an HTMLElement.`);
        });
        it("a comment as errorMessageContainer throws", () => {
            expect(() => new FormElement({ input: document.createElement("input"), errorMessageContainer: document.createComment("c") }))
                .toThrowError(`FormElement: "errorMessageContainer", if provided, must be an HTMLElement.`);
        });
        it("a fragment as container throws", () => {
            expect(() => new FormElement({ input: document.createElement("input"), container: document.createDocumentFragment() }))
                .toThrowError(`FormElement: "container", if provided, must be an HTMLElement.`);
        });
        it("a text node as labelElement throws", () => {
            expect(() => new FormElement({ input: document.createElement("input"), labelElement: document.createTextNode("x") }))
                .toThrowError(`FormElement: "labelElement", if provided, must be an HTMLElement.`);
        });
    });

    describe("input - must be a field element", () => {
        const errorMessage = `FormElement: "input" must be an <input>, <select>, or <textarea> element.`;
        it("a div throws", () => {
            expect(() => new FormElement({ input: document.createElement("div"), type: "text" })).toThrowError(errorMessage);
        });
        it("a button throws", () => {
            expect(() => new FormElement({ input: document.createElement("button") })).toThrowError(errorMessage);
        });
        it("input, select, textarea are accepted", () => {
            ["input", "select", "textarea"].forEach(tag => {
                expect(() => new FormElement({ input: document.createElement(tag) })).not.toThrow();
            });
        });
    });

    describe("type - must match the element", () => {
        it("checkbox on a text input throws", () => {
            expect(() => new FormElement({ input: document.createElement("input"), type: "checkbox" }))
                .toThrowError(`FormElement: "type" ("checkbox") does not match the input element, which is "text".`);
        });
        it("textarea on an input throws", () => {
            expect(() => new FormElement({ input: document.createElement("input"), type: "textarea" }))
                .toThrowError(`FormElement: "type" ("textarea") does not match the input element, which is "text".`);
        });
        it("select on a textarea throws", () => {
            expect(() => new FormElement({ input: document.createElement("textarea"), type: "select" }))
                .toThrowError(`FormElement: "type" ("select") does not match the input element, which is "textarea".`);
        });
        it("a matching explicit type is valid", () => {
            const input = document.createElement("input");
            input.type = "email";
            expect(new FormElement({ input, type: "email" }).type).toEqual("email");
        });
    });

    describe("label - resolution", () => {
        it("a blank explicit label throws", () => {
            expect(() => new FormElement({ input: document.createElement("input"), label: "   " }))
                .toThrowError(`FormElement: "label", if provided, must be a non-empty string.`);
        });
        it("an empty explicit label throws", () => {
            expect(() => new FormElement({ input: document.createElement("input"), label: "" }))
                .toThrowError(`FormElement: "label", if provided, must be a non-empty string.`);
        });
        it("a blank labelElement text falls through to name", () => {
            const labelElement = document.createElement("label");
            labelElement.textContent = "   ";
            const input = document.createElement("input");
            input.name = "from_name";
            expect(new FormElement({ input, labelElement }).label).toEqual("from_name");
        });
        it("a blank name falls through to id", () => {
            const input = document.createElement("input");
            input.name = "  ";
            input.id = "from_id";
            expect(new FormElement({ input }).label).toEqual("from_id");
        });
        it("finds a <label> that wraps the input", () => {
            const labelElement = document.createElement("label");
            labelElement.textContent = "Wrapped";
            const input = document.createElement("input");
            labelElement.append(input);
            const formElement = new FormElement({ input });
            expect(formElement.labelElement).toBe(labelElement);
            expect(formElement.label).toEqual("Wrapped");
        });
        it("finds a <label for> before the field is attached to the page", () => {
            const wrapper = document.createElement("div");
            const labelElement = document.createElement("label");
            labelElement.htmlFor = "detached_field";
            labelElement.textContent = "Detached";
            const input = document.createElement("input");
            input.id = "detached_field";
            wrapper.append(labelElement, input);
            const formElement = new FormElement({ input });
            expect(formElement.labelElement).toBe(labelElement);
            expect(formElement.label).toEqual("Detached");
        });
        it("an id containing a quote does not crash the label lookup", () => {
            const input = document.createElement("input");
            input.id = "a'b";
            expect(new FormElement({ input }).label).toEqual("a'b");
        });
    });

    describe("checkbox and boolean validation go together", () => {
        const checkbox = () => {
            const input = document.createElement("input");
            input.type = "checkbox";
            return input;
        };
        it("a checkbox with no validation defaults to boolean", () => {
            expect(new FormElement({ input: checkbox() }).validation.expectedType).toEqual("boolean");
        });
        it("a non-checkbox with no validation defaults to string", () => {
            expect(new FormElement({ input: document.createElement("input") }).validation.expectedType).toEqual("string");
        });
        it("a checkbox with boolean validation is valid", () => {
            expect(() => new FormElement({ input: checkbox(), validation: new FieldValidation({ expectedType: "boolean" }) })).not.toThrow();
        });
        it("a checkbox with number validation throws", () => {
            expect(() => new FormElement({ input: checkbox(), validation: new FieldValidation({ expectedType: "number" }) }))
                .toThrowError(`FormElement: a "checkbox" input only allows "validation.expectedType" of: boolean (got "number").`);
        });
        it("a text input with boolean validation throws", () => {
            expect(() => new FormElement({ input: document.createElement("input"), validation: new FieldValidation({ expectedType: "boolean" }) }))
                .toThrowError(`FormElement: a "text" input only allows "validation.expectedType" of: string, number (got "boolean").`);
        });
    });

    describe("metadata - copy safety", () => {
        it("mutating the original object does not change the instance", () => {
            const metadata = { a: 1 };
            const formElement = new FormElement({ input: document.createElement("input"), metadata });
            metadata.b = 2;
            expect(formElement.metadata).toEqual({ a: 1 });
        });
        it("the returned object is frozen, so it can't be changed", () => {
            const formElement = new FormElement({ input: document.createElement("input"), metadata: { a: 1 } });
            expect(Object.isFrozen(formElement.metadata)).toBe(true);
            expect(() => { formElement.metadata.a = 99; }).toThrowError(TypeError);
            expect(formElement.metadata).toEqual({ a: 1 });
        });
        it("an Object.create(null) metadata stays prototype-less", () => {
            const metadata = Object.create(null);
            metadata.ajaxParamName = "x";
            const formElement = new FormElement({ input: document.createElement("input"), metadata });
            expect(Object.getPrototypeOf(formElement.metadata)).toBeNull();
            expect(formElement.metadata.ajaxParamName).toEqual("x");
        });
    });

    describe("label text - excludes the field inside a wrapping label", () => {
        it("a wrapping label around a select doesn't include the options", () => {
            const labelElement = document.createElement("label");
            labelElement.append("Country ");
            const select = document.createElement("select");
            ["US", "UK"].forEach(text => {
                const option = document.createElement("option");
                option.textContent = text;
                select.append(option);
            });
            labelElement.append(select);
            expect(new FormElement({ input: select }).label).toEqual("Country");
        });
        it("a wrapping label around a textarea doesn't include its default text", () => {
            const labelElement = document.createElement("label");
            labelElement.append("Notes ");
            const textarea = document.createElement("textarea");
            textarea.textContent = "default text";
            labelElement.append(textarea);
            expect(new FormElement({ input: textarea }).label).toEqual("Notes");
        });
        it("the label element itself is left untouched", () => {
            const labelElement = document.createElement("label");
            labelElement.append("Country ");
            const select = document.createElement("select");
            labelElement.append(select);
            new FormElement({ input: select });
            expect(labelElement.contains(select)).toBe(true);
        });
    });

    describe("element checks - fake element objects", () => {
        it("a plain object with nodeType 1 as input gets the standard error, not a TypeError", () => {
            expect(() => new FormElement({ input: { nodeType: 1, tagName: "INPUT", type: "text" } }))
                .toThrowError(`FormElement: "input" is required and must be an HTMLElement.`);
        });
        it("a plain object with nodeType 1 as labelElement throws", () => {
            expect(() => new FormElement({ input: document.createElement("input"), labelElement: { nodeType: 1 } }))
                .toThrowError(`FormElement: "labelElement", if provided, must be an HTMLElement.`);
        });
        it("a plain object with nodeType 1 as errorMessageContainer throws", () => {
            expect(() => new FormElement({ input: document.createElement("input"), errorMessageContainer: { nodeType: 1 } }))
                .toThrowError(`FormElement: "errorMessageContainer", if provided, must be an HTMLElement.`);
        });
        it("a plain object with nodeType 1 as container throws", () => {
            expect(() => new FormElement({ input: document.createElement("input"), container: { nodeType: 1 } }))
                .toThrowError(`FormElement: "container", if provided, must be an HTMLElement.`);
        });
        it("an element from an iframe is accepted", () => {
            const iframe = document.createElement("iframe");
            document.body.append(iframe);
            const foreignInput = iframe.contentDocument.createElement("input");
            expect(() => new FormElement({ input: foreignInput })).not.toThrow();
            iframe.remove();
        });
    });

    describe("unknown keys", () => {
        it("a misspelled key throws", () => {
            expect(() => new FormElement({ input: document.createElement("input"), lable: "Name" }))
                .toThrowError(`FormElement: unknown option(s) "lable". Allowed: input, label, labelElement, errorMessageContainer, container, type, validation, metadata.`);
        });
        it("a validation rule passed directly gets a hint to use FieldValidation", () => {
            expect(() => new FormElement({ input: document.createElement("input"), required: true, minChars: 3 }))
                .toThrowError(`FormElement: unknown option(s) "required", "minChars". Allowed: input, label, labelElement, errorMessageContainer, container, type, validation, metadata. Validation rules go in a FieldValidation: { validation: new FieldValidation({ ... }) }.`);
        });
    });

    describe("errorMessageContainer - must not overwrite the field", () => {
        it("the input itself throws", () => {
            const input = document.createElement("input");
            expect(() => new FormElement({ input, errorMessageContainer: input }))
                .toThrowError(`FormElement: "errorMessageContainer" must not be or contain the input — its contents are replaced with error messages.`);
        });
        it("an element wrapping the input throws", () => {
            const wrapper = document.createElement("div");
            const input = document.createElement("input");
            wrapper.append(input);
            expect(() => new FormElement({ input, container: wrapper, errorMessageContainer: wrapper }))
                .toThrowError(`FormElement: "errorMessageContainer" must not be or contain the input — its contents are replaced with error messages.`);
        });
        it("the label element throws", () => {
            const labelElement = document.createElement("label");
            labelElement.textContent = "Name";
            expect(() => new FormElement({ input: document.createElement("input"), labelElement, errorMessageContainer: labelElement }))
                .toThrowError(`FormElement: "errorMessageContainer" must not be or contain the label element — its contents are replaced with error messages.`);
        });
        it("an element wrapping the label throws", () => {
            const wrapper = document.createElement("div");
            const labelElement = document.createElement("label");
            labelElement.textContent = "Name";
            wrapper.append(labelElement);
            expect(() => new FormElement({ input: document.createElement("input"), labelElement, errorMessageContainer: wrapper }))
                .toThrowError(`FormElement: "errorMessageContainer" must not be or contain the label element — its contents are replaced with error messages.`);
        });
        it("a separate sibling element is valid", () => {
            const wrapper = document.createElement("div");
            const input = document.createElement("input");
            const errorMessageContainer = document.createElement("div");
            wrapper.append(input, errorMessageContainer);
            expect(() => new FormElement({ input, container: wrapper, errorMessageContainer })).not.toThrow();
        });
    });

    describe("container - must contain the input", () => {
        const errorMessage = `FormElement: "container", if provided, must contain the input.`;
        it("an unrelated element throws", () => {
            expect(() => new FormElement({ input: document.createElement("input"), container: document.createElement("div") })).toThrowError(errorMessage);
        });
        it("the input itself throws", () => {
            const input = document.createElement("input");
            expect(() => new FormElement({ input, container: input })).toThrowError(errorMessage);
        });
        it("a deeper ancestor is valid", () => {
            const outer = document.createElement("div");
            const inner = document.createElement("div");
            const input = document.createElement("input");
            inner.append(input);
            outer.append(inner);
            expect(() => new FormElement({ input, container: outer })).not.toThrow();
        });
    });

    describe("type - controls without a value are not fields", () => {
        ["submit", "reset", "image", "button"].forEach(inputType => {
            it(`${inputType} throws`, () => {
                const input = document.createElement("input");
                input.type = inputType;
                expect(() => new FormElement({ input })).toThrowError(/FormElement: "type" is required and must be one of:/);
            });
        });
        it("hidden is still accepted", () => {
            ["hidden"].forEach(inputType => {
                const input = document.createElement("input");
                input.type = inputType;
                expect(() => new FormElement({ input })).not.toThrow();
            });
        });
    });

    describe("field type and expectedType must agree", () => {
        const field = (inputType) => {
            const input = document.createElement("input");
            input.type = inputType;
            return input;
        };
        it("number input defaults to number", () => {
            expect(new FormElement({ input: field("number") }).validation.expectedType).toEqual("number");
        });
        it("range input defaults to number", () => {
            expect(new FormElement({ input: field("range") }).validation.expectedType).toEqual("number");
        });
        it("number input with string validation throws", () => {
            expect(() => new FormElement({ input: field("number"), validation: new FieldValidation({ expectedType: "string" }) }))
                .toThrowError(`FormElement: a "number" input only allows "validation.expectedType" of: number (got "string").`);
        });
        it("text input with date validation throws", () => {
            expect(() => new FormElement({ input: field("text"), validation: new FieldValidation({ expectedType: "date" }) }))
                .toThrowError(`FormElement: a "text" input only allows "validation.expectedType" of: string, number (got "date").`);
        });
        it("date input allows string or date", () => {
            expect(() => new FormElement({ input: field("date"), validation: new FieldValidation({ expectedType: "string" }) })).not.toThrow();
            expect(() => new FormElement({ input: field("date"), validation: new FieldValidation({ expectedType: "date" }) })).not.toThrow();
        });
        it("date input with number validation throws", () => {
            expect(() => new FormElement({ input: field("date"), validation: new FieldValidation({ expectedType: "number" }) }))
                .toThrowError(`FormElement: a "date" input only allows "validation.expectedType" of: date, string (got "number").`);
        });
        it("text input allows a number (e.g. a numeric code typed as text)", () => {
            expect(() => new FormElement({ input: field("text"), validation: new FieldValidation({ expectedType: "number" }) })).not.toThrow();
        });
        it("select defaults to string", () => {
            expect(new FormElement({ input: document.createElement("select") }).validation.expectedType).toEqual("string");
        });
    });

    describe("label - explicit label is trimmed", () => {
        it("surrounding spaces are removed", () => {
            expect(new FormElement({ input: document.createElement("input"), label: "  Name  " }).label).toEqual("Name");
        });
    });

    describe("metadata - deep, frozen, stable", () => {
        it("nested objects are copied", () => {
            const metadata = { ajax: { name: "x" } };
            const formElement = new FormElement({ input: document.createElement("input"), metadata });
            metadata.ajax.name = "CHANGED";
            expect(formElement.metadata.ajax.name).toEqual("x");
        });
        it("nested objects and arrays are frozen", () => {
            const formElement = new FormElement({ input: document.createElement("input"), metadata: { ajax: { name: "x" }, tags: ["a"] } });
            expect(Object.isFrozen(formElement.metadata.ajax)).toBe(true);
            expect(Object.isFrozen(formElement.metadata.tags)).toBe(true);
        });
        it("returns the same object on every access", () => {
            const formElement = new FormElement({ input: document.createElement("input"), metadata: { a: 1 } });
            expect(formElement.metadata).toBe(formElement.metadata);
        });
        it("functions are kept as-is", () => {
            const callback = () => "hi";
            const formElement = new FormElement({ input: document.createElement("input"), metadata: { callback } });
            expect(formElement.metadata.callback).toBe(callback);
        });
    });

    describe("metadata - deep copy edge cases", () => {
        it("an object that refers to itself is copied without recursing forever", () => {
            const metadata = { a: 1 };
            metadata.self = metadata;
            const formElement = new FormElement({ input: document.createElement("input"), metadata });
            expect(formElement.metadata.self).toBe(formElement.metadata);
            expect(formElement.metadata).not.toBe(metadata);
        });
        it("a cycle through an array is handled", () => {
            const list = [];
            const metadata = { list };
            list.push(metadata);
            const formElement = new FormElement({ input: document.createElement("input"), metadata });
            expect(formElement.metadata.list[0]).toBe(formElement.metadata);
        });
        it("two keys sharing one object still share one object", () => {
            const shared = { x: 1 };
            const formElement = new FormElement({ input: document.createElement("input"), metadata: { a: shared, b: shared } });
            expect(formElement.metadata.a).toBe(formElement.metadata.b);
            expect(formElement.metadata.a).not.toBe(shared);
        });
        it("symbol keys are kept", () => {
            const key = Symbol("key");
            const formElement = new FormElement({ input: document.createElement("input"), metadata: { [key]: 1, ajaxParamName: "x" } });
            expect(formElement.metadata[key]).toBe(1);
            expect(formElement.metadata.ajaxParamName).toEqual("x");
        });
        it("a plain metadata object from an iframe is accepted", () => {
            const iframe = document.createElement("iframe");
            document.body.append(iframe);
            const metadata = new iframe.contentWindow.Object();
            metadata.ajaxParamName = "x";
            const formElement = new FormElement({ input: document.createElement("input"), metadata });
            iframe.remove();
            expect(formElement.metadata.ajaxParamName).toEqual("x");
        });
    });

    describe("label - wrapping label whose 'for' points elsewhere", () => {
        it("is not used as this input's label", () => {
            const wrapper = document.createElement("div");
            const labelElement = document.createElement("label");
            labelElement.htmlFor = "other_field";
            labelElement.textContent = "Other field";
            const input = document.createElement("input");
            input.name = "this_field";
            labelElement.append(input);
            const other = document.createElement("input");
            other.id = "other_field";
            wrapper.append(labelElement, other);
            const formElement = new FormElement({ input });
            expect(formElement.labelElement).toBeNull();
            expect(formElement.label).toEqual("this_field");
        });
        it("is used when its 'for' matches the input's id", () => {
            const labelElement = document.createElement("label");
            labelElement.htmlFor = "same_field";
            labelElement.textContent = "Same field";
            const input = document.createElement("input");
            input.id = "same_field";
            labelElement.append(input);
            expect(new FormElement({ input }).label).toEqual("Same field");
        });
    });

    describe("label - aria-labelledby", () => {
        const build = () => {
            const wrapper = document.createElement("div");
            const first = document.createElement("span");
            first.id = "labelled_first";
            first.textContent = "Billing";
            const second = document.createElement("span");
            second.id = "labelled_second";
            second.textContent = "Address";
            const input = document.createElement("input");
            input.name = "from_name";
            wrapper.append(first, second, input);
            return input;
        };
        it("is used before aria-label and name", () => {
            const input = build();
            input.setAttribute("aria-labelledby", "labelled_first");
            input.setAttribute("aria-label", "From Aria");
            expect(new FormElement({ input }).label).toEqual("Billing");
        });
        it("joins several ids in order", () => {
            const input = build();
            input.setAttribute("aria-labelledby", "labelled_first labelled_second");
            expect(new FormElement({ input }).label).toEqual("Billing Address");
        });
        it("ids that don't exist fall through to the next fallback", () => {
            const input = build();
            input.setAttribute("aria-labelledby", "missing_id");
            expect(new FormElement({ input }).label).toEqual("from_name");
        });
        it("a <label> still takes precedence", () => {
            const input = build();
            input.setAttribute("aria-labelledby", "labelled_first");
            const labelElement = document.createElement("label");
            labelElement.textContent = "From Label";
            expect(new FormElement({ input, labelElement }).label).toEqual("From Label");
        });
    });

    describe("labelElement - must not be the field", () => {
        it("the input itself throws", () => {
            const input = document.createElement("input");
            expect(() => new FormElement({ input, labelElement: input }))
                .toThrowError(`FormElement: "labelElement" must not be the input itself.`);
        });
        it("a non-label wrapper around the input throws", () => {
            const wrapper = document.createElement("div");
            const input = document.createElement("input");
            wrapper.append(input);
            expect(() => new FormElement({ input, labelElement: wrapper, container: wrapper }))
                .toThrowError(`FormElement: "labelElement" must not contain the input (only a <label> element may wrap its input).`);
        });
        it("a <label> wrapping the input is valid", () => {
            const labelElement = document.createElement("label");
            labelElement.append("Name ");
            const input = document.createElement("input");
            labelElement.append(input);
            expect(new FormElement({ input, labelElement }).label).toEqual("Name");
        });
    });

    describe("field types - single-value only", () => {
        it("a radio throws", () => {
            const input = document.createElement("input");
            input.type = "radio";
            expect(() => new FormElement({ input })).toThrowError(/FormElement: "type" is required and must be one of:/);
        });
        it("a <select multiple> throws", () => {
            const select = document.createElement("select");
            select.multiple = true;
            expect(() => new FormElement({ input: select }))
                .toThrowError(`FormElement: "input" must not be a <select multiple> — only single-value fields are supported.`);
        });
        it("a single <select> is valid", () => {
            expect(() => new FormElement({ input: document.createElement("select") })).not.toThrow();
        });
    });

    describe("field type and expectedType - text-only inputs", () => {
        ["email", "url", "tel", "password", "color", "month", "week", "time"].forEach(inputType => {
            it(`${inputType} rejects number`, () => {
                const input = document.createElement("input");
                input.type = inputType;
                expect(() => new FormElement({ input, validation: new FieldValidation({ expectedType: "number" }) }))
                    .toThrowError(`FormElement: a "${inputType}" input only allows "validation.expectedType" of: string (got "number").`);
            });
        });
        it("textarea rejects number", () => {
            expect(() => new FormElement({ input: document.createElement("textarea"), validation: new FieldValidation({ expectedType: "number" }) }))
                .toThrowError(`FormElement: a "textarea" input only allows "validation.expectedType" of: string (got "number").`);
        });
        ["text", "search", "hidden"].forEach(inputType => {
            it(`${inputType} allows number`, () => {
                const input = document.createElement("input");
                input.type = inputType;
                expect(() => new FormElement({ input, validation: new FieldValidation({ expectedType: "number" }) })).not.toThrow();
            });
        });
        it("select allows number", () => {
            expect(() => new FormElement({ input: document.createElement("select"), validation: new FieldValidation({ expectedType: "number" }) })).not.toThrow();
        });
    });

    describe("immutability - instances are frozen", () => {
        it("a getter can't be overridden with defineProperty", () => {
            const formElement = new FormElement({ input: document.createElement("input") });
            const originalValidation = formElement.validation;
            expect(() => Object.defineProperty(formElement, "validation", { value: new FieldValidation({ required: true }) })).toThrowError(TypeError);
            expect(formElement.validation).toBe(originalValidation);
        });
        it("new properties can't be added", () => {
            const formElement = new FormElement({ input: document.createElement("input") });
            expect(() => { formElement.extra = 1; }).toThrowError(TypeError);
        });
        it("a subclass can still add its own fields", () => {
            class TaggedFormElement extends FormElement {
                tag = "custom";
            }
            expect(new TaggedFormElement({ input: document.createElement("input") }).tag).toEqual("custom");
        });
    });

    describe("element checks - elements from other documents", () => {
        it("an element from an iframe that has since been removed is accepted", () => {
            const iframe = document.createElement("iframe");
            document.body.append(iframe);
            const foreignInput = iframe.contentDocument.createElement("input");
            iframe.remove();
            expect(() => new FormElement({ input: foreignInput })).not.toThrow();
        });
        it("an element from a DOMParser document is accepted", () => {
            const parsed = new DOMParser().parseFromString("<input id='parsed'>", "text/html");
            expect(() => new FormElement({ input: parsed.getElementById("parsed") })).not.toThrow();
        });
        it("an element inside a <template> is accepted", () => {
            const template = document.createElement("template");
            template.innerHTML = "<input>";
            expect(() => new FormElement({ input: template.content.firstElementChild })).not.toThrow();
        });
        it("an object pretending to be an element via its prototype is rejected", () => {
            const fake = Object.create(HTMLInputElement.prototype);
            expect(() => new FormElement({ input: fake }))
                .toThrowError(`FormElement: "input" is required and must be an HTMLElement.`);
        });
    });

    describe("errorMessageContainer - must not overwrite an aria-labelledby target", () => {
        it("the element aria-labelledby points to throws", () => {
            const wrapper = document.createElement("div");
            const labelSource = document.createElement("span");
            labelSource.id = "error_target_label";
            labelSource.textContent = "Name";
            const input = document.createElement("input");
            input.setAttribute("aria-labelledby", "error_target_label");
            wrapper.append(labelSource, input);
            expect(() => new FormElement({ input, errorMessageContainer: labelSource }))
                .toThrowError(`FormElement: "errorMessageContainer" must not be or contain an element the input's aria-labelledby points to — its contents are replaced with error messages.`);
        });
        it("an element wrapping the aria-labelledby target throws", () => {
            const wrapper = document.createElement("div");
            const labelHolder = document.createElement("div");
            const labelSource = document.createElement("span");
            labelSource.id = "error_target_label_2";
            labelSource.textContent = "Name";
            labelHolder.append(labelSource);
            const input = document.createElement("input");
            input.setAttribute("aria-labelledby", "error_target_label_2");
            wrapper.append(labelHolder, input);
            expect(() => new FormElement({ input, errorMessageContainer: labelHolder }))
                .toThrowError(/must not be or contain an element the input's aria-labelledby points to/);
        });
    });

    describe("label - live", () => {
        it("a fallback label follows later changes to the label element's text", () => {
            const labelElement = document.createElement("label");
            labelElement.textContent = "Old";
            const formElement = new FormElement({ input: document.createElement("input"), labelElement });
            labelElement.textContent = "New";
            expect(formElement.label).toEqual("New");
        });
        it("a fallback label follows a later change to the input's name", () => {
            const input = document.createElement("input");
            input.name = "first_name";
            const formElement = new FormElement({ input });
            input.name = "given_name";
            expect(formElement.label).toEqual("given_name");
        });
        it("an explicit label stays fixed", () => {
            const labelElement = document.createElement("label");
            labelElement.textContent = "From Label";
            const formElement = new FormElement({ input: document.createElement("input"), labelElement, label: "Explicit" });
            labelElement.textContent = "Changed";
            expect(formElement.label).toEqual("Explicit");
        });
    });

    describe("type - change after construction is reported", () => {
        it("reading type after the input became a checkbox throws", () => {
            const input = document.createElement("input");
            const formElement = new FormElement({ input });
            input.type = "checkbox";
            expect(() => formElement.type)
                .toThrowError(`FormElement: the input's type changed from "text" to "checkbox" after construction — create a new FormElement for it.`);
        });
        it("reading type while it's unchanged works", () => {
            const input = document.createElement("input");
            input.type = "email";
            expect(new FormElement({ input }).type).toEqual("email");
        });
    });

    describe("immutability - subclasses, the prototype, and the class", () => {
        it("a subclass instance's getter can't be overridden with defineProperty", () => {
            class TaggedFormElement extends FormElement { }
            const instance = new TaggedFormElement({ input: document.createElement("input") });
            const originalValidation = instance.validation;
            expect(() => Object.defineProperty(instance, "validation", { value: new FieldValidation({ required: true }) })).toThrowError(TypeError);
            expect(instance.validation).toBe(originalValidation);
        });
        it("a prototype getter can't be replaced", () => {
            expect(() => Object.defineProperty(FormElement.prototype, "label", { get: () => "hacked" })).toThrowError(TypeError);
        });
        it("the class can't gain new static properties", () => {
            expect(() => { FormElement.extra = 1; }).toThrowError(TypeError);
        });
        it("the instance still looks empty to Object.keys", () => {
            expect(Object.keys(new FormElement({ input: document.createElement("input") }))).toEqual([]);
        });
    });

    describe("config and metadata - read exactly once", () => {
        it("a config getter that throws gets a FormElement error, with the original as cause", () => {
            const config = { input: document.createElement("input"), get label() { throw new Error("boom"); } };
            try {
                new FormElement(config);
                fail("expected a throw");
            } catch (error) {
                expect(error.message).toEqual(`FormElement: the configuration object could not be read.`);
                expect(error.cause.message).toEqual("boom");
            }
        });
        it("a config getter is read only once", () => {
            let reads = 0;
            const input = document.createElement("input");
            const config = { get input() { reads++; return input; } };
            new FormElement(config);
            expect(reads).toBe(1);
        });
        it("a metadata getter that throws gets a FormElement error, with the original as cause", () => {
            const metadata = { get ajaxParamName() { throw new Error("boom"); } };
            try {
                new FormElement({ input: document.createElement("input"), metadata });
                fail("expected a throw");
            } catch (error) {
                expect(error.message).toEqual(`FormElement: "metadata" could not be copied.`);
                expect(error.cause.message).toEqual("boom");
            }
        });
    });

    describe("type - read from the type attribute, the same in every browser", () => {
        // Simulates a browser that doesn't implement an input type (e.g.
        // Firefox and "month"/"week"): the attribute says one thing, but
        // the element's .type property reports "text".
        const unimplementedTypeInput = (declaredType) => {
            const input = document.createElement("input");
            input.setAttribute("type", declaredType);
            Object.defineProperty(input, "type", { get: () => "text" });
            return input;
        };

        it("an unimplemented month input is still detected as month", () => {
            expect(new FormElement({ input: unimplementedTypeInput("month") }).type).toEqual("month");
        });
        it("an unimplemented week input still rejects number", () => {
            expect(() => new FormElement({ input: unimplementedTypeInput("week"), validation: new FieldValidation({ expectedType: "number" }) }))
                .toThrowError(`FormElement: a "week" input only allows "validation.expectedType" of: string (got "number").`);
        });
        it("an explicit type must match the declared attribute, not .type", () => {
            expect(new FormElement({ input: unimplementedTypeInput("month"), type: "month" }).type).toEqual("month");
        });
        it("the attribute is case-insensitive", () => {
            const input = document.createElement("input");
            input.setAttribute("type", "EMAIL");
            expect(new FormElement({ input }).type).toEqual("email");
        });
        it("a missing type attribute means text", () => {
            expect(new FormElement({ input: document.createElement("input") }).type).toEqual("text");
        });
        it("an unknown type attribute means text, as in HTML", () => {
            const input = document.createElement("input");
            input.setAttribute("type", "datetime");
            expect(new FormElement({ input }).type).toEqual("text");
        });
        it("a later change to the type attribute is still reported", () => {
            const input = document.createElement("input");
            const formElement = new FormElement({ input });
            input.setAttribute("type", "checkbox");
            expect(() => formElement.type).toThrowError(/the input's type changed from "text" to "checkbox"/);
        });
    });

    describe("field type and expectedType - date defaults", () => {
        it("a date input with no validation defaults to date", () => {
            const input = document.createElement("input");
            input.type = "date";
            expect(new FormElement({ input }).validation.expectedType).toEqual("date");
        });
        it("a datetime-local input with no validation defaults to date", () => {
            const input = document.createElement("input");
            input.type = "datetime-local";
            expect(new FormElement({ input }).validation.expectedType).toEqual("date");
        });
    });

    describe("field types - file inputs aren't supported", () => {
        it("a file input throws", () => {
            const input = document.createElement("input");
            input.type = "file";
            expect(() => new FormElement({ input })).toThrowError(/FormElement: "type" is required and must be one of:/);
        });
    });

    describe("required - not allowed where it can never fail", () => {
        ["range", "color"].forEach(inputType => {
            it(`required on a ${inputType} input throws`, () => {
                const input = document.createElement("input");
                input.type = inputType;
                expect(() => new FormElement({ input, validation: new FieldValidation({ expectedType: inputType === "range" ? "number" : "string", required: true }) }))
                    .toThrowError(`FormElement: "validation.required" has no effect on a "${inputType}" input — it always has a value.`);
            });
            it(`an optional ${inputType} input is fine`, () => {
                const input = document.createElement("input");
                input.type = inputType;
                expect(() => new FormElement({ input })).not.toThrow();
            });
        });
    });

    describe("date options vs min/max - compared by the field's type", () => {
        const dateInput = (type) => {
            const input = document.createElement("input");
            input.type = type;
            return input;
        };
        const startOfToday = () => {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            return date;
        };

        it("a date input allows an option of today with min: now (same calendar day)", () => {
            const validation = new FieldValidation({ expectedType: "date", min: new Date(), options: [startOfToday()] });
            expect(() => new FormElement({ input: dateInput("date"), validation })).not.toThrow();
        });
        it("a date input rejects an option on a day before min", () => {
            const yesterday = startOfToday();
            yesterday.setDate(yesterday.getDate() - 1);
            const validation = new FieldValidation({ expectedType: "date", min: new Date(), options: [yesterday] });
            expect(() => new FormElement({ input: dateInput("date"), validation }))
                .toThrowError(/FormElement: "validation.options" contains value\(s\) that "validation.min" would always reject on a "date" input: \d{4}-\d{2}-\d{2}\./);
        });
        it("a date input rejects an option on a day after max, naming it as a date", () => {
            const validation = new FieldValidation({ expectedType: "date", max: new Date(2027, 0, 1), options: [new Date(2026, 0, 1), new Date(2030, 0, 1)] });
            expect(() => new FormElement({ input: dateInput("date"), validation }))
                .toThrowError(`FormElement: "validation.options" contains value(s) that "validation.max" would always reject on a "date" input: 2030-01-01.`);
        });
        it("a datetime-local input compares exact times", () => {
            const min = new Date(2026, 9, 27, 12, 0);
            const validation = new FieldValidation({ expectedType: "date", min, options: [new Date(2026, 9, 27, 9, 0)] });
            expect(() => new FormElement({ input: dateInput("datetime-local"), validation }))
                .toThrowError(`FormElement: "validation.options" contains value(s) that "validation.min" would always reject on a "datetime-local" input: 2026-10-27T09:00.`);
        });
        it("the same FieldValidation is fine on a date input but not on a datetime-local one", () => {
            const validation = new FieldValidation({ expectedType: "date", min: new Date(2026, 9, 27, 12, 0), options: [new Date(2026, 9, 27, 9, 0)] });
            expect(() => new FormElement({ input: dateInput("date"), validation })).not.toThrow();
            expect(() => new FormElement({ input: dateInput("datetime-local"), validation })).toThrow();
        });
        it("FormBuilder gets the same check (it builds a FormElement)", () => {
            try {
                expect(() => FormBuilder.createFormLine({ type: "date", label: "Day", min: new Date(), options: [startOfToday()] })).not.toThrow();
                expect(() => FormBuilder.createFormLine({ type: "date", label: "Day", max: new Date(2027, 0, 1), options: [new Date(2030, 0, 1)] }))
                    .toThrowError(/would always reject on a "date" input: 2030-01-01\./);
            } finally {
                FormBuilder.clearInputContainers();
            }
        });
    });

    describe("required - not allowed on a hidden input", () => {
        it("throws", () => {
            const input = document.createElement("input");
            input.type = "hidden";
            expect(() => new FormElement({ input, validation: new FieldValidation({ required: true }) }))
                .toThrowError(`FormElement: "validation.required" has no effect on a "hidden" input — hidden inputs aren't validated.`);
        });
        it("an optional hidden input is fine", () => {
            const input = document.createElement("input");
            input.type = "hidden";
            expect(() => new FormElement({ input })).not.toThrow();
        });
    });

    describe("validation attributes must agree with FieldValidation", () => {
        const withAttribute = (name, value) => {
            const input = document.createElement("input");
            input.setAttribute(name, value);
            return input;
        };
        it("a different minlength throws", () => {
            expect(() => new FormElement({ input: withAttribute("minlength", "5"), validation: new FieldValidation({ minChars: 3 }) }))
                .toThrowError(`FormElement: the input's minlength attribute ("5") doesn't match "validation.minChars" ("3").`);
        });
        it("a different maxlength throws", () => {
            expect(() => new FormElement({ input: withAttribute("maxlength", "10"), validation: new FieldValidation({ maxChars: 20 }) }))
                .toThrowError(`FormElement: the input's maxlength attribute ("10") doesn't match "validation.maxChars" ("20").`);
        });
        it("a different pattern throws", () => {
            expect(() => new FormElement({ input: withAttribute("pattern", "\\d+"), validation: new FieldValidation({ pattern: "[a-z]+" }) }))
                .toThrowError(`FormElement: the input's pattern attribute ("\\d+") doesn't match "validation.pattern" ("[a-z]+").`);
        });
        it("matching values are fine", () => {
            expect(() => new FormElement({ input: withAttribute("minlength", "3"), validation: new FieldValidation({ minChars: 3 }) })).not.toThrow();
            expect(() => new FormElement({ input: withAttribute("pattern", "\\d+"), validation: new FieldValidation({ pattern: "\\d+" }) })).not.toThrow();
        });
        it("an attribute with no matching rule is fine (FormValidator uses it)", () => {
            expect(() => new FormElement({ input: withAttribute("minlength", "3") })).not.toThrow();
        });
        it("FormBuilder's own attributes always agree", () => {
            try {
                expect(() => FormBuilder.createFormLine({ label: "Code", minChars: 2, maxChars: 5, pattern: "[A-Z]+" })).not.toThrow();
            } finally {
                FormBuilder.clearInputContainers();
            }
        });
    });

    describe("date options - same-day duplicates on a date input", () => {
        const dateInput = (type) => {
            const input = document.createElement("input");
            input.type = type;
            return input;
        };
        it("two options on the same day throw", () => {
            const validation = new FieldValidation({ expectedType: "date", options: [new Date(2026, 0, 1, 9), new Date(2026, 0, 1, 15)] });
            expect(() => new FormElement({ input: dateInput("date"), validation }))
                .toThrowError(`FormElement: "validation.options" has more than one value on the same day for a "date" input: 2026-01-01.`);
        });
        it("options on different days are fine", () => {
            const validation = new FieldValidation({ expectedType: "date", options: [new Date(2026, 0, 1, 9), new Date(2026, 0, 2, 9)] });
            expect(() => new FormElement({ input: dateInput("date"), validation })).not.toThrow();
        });
        it("the same options are fine on a datetime-local input (different times)", () => {
            const validation = new FieldValidation({ expectedType: "date", options: [new Date(2026, 0, 1, 9), new Date(2026, 0, 1, 15)] });
            expect(() => new FormElement({ input: dateInput("datetime-local"), validation })).not.toThrow();
        });
    });

    describe("validation attributes - compared by meaning, not raw text", () => {
        const withAttribute = (name, value) => {
            const input = document.createElement("input");
            input.setAttribute(name, value);
            return input;
        };
        it("a pattern containing '/' matches the same rule", () => {
            expect(() => new FormElement({ input: withAttribute("pattern", "a/b"), validation: new FieldValidation({ pattern: "a/b" }) })).not.toThrow();
        });
        it("a pattern attribute matches the same RegExp rule", () => {
            expect(() => new FormElement({ input: withAttribute("pattern", "a/b"), validation: new FieldValidation({ pattern: /a\/b/ }) })).not.toThrow();
        });
        it("a different pattern still throws, showing the rule's source", () => {
            expect(() => new FormElement({ input: withAttribute("pattern", "a/b"), validation: new FieldValidation({ pattern: "a/c" }) }))
                .toThrowError(`FormElement: the input's pattern attribute ("a/b") doesn't match "validation.pattern" ("a\\/c").`);
        });
        it("a rule with a flag an attribute can't carry doesn't match a plain attribute", () => {
            expect(() => new FormElement({ input: withAttribute("pattern", "abc"), validation: new FieldValidation({ pattern: /abc/i }) }))
                .toThrowError(`FormElement: the input's pattern attribute ("abc") doesn't match "validation.pattern" ("abc").`);
        });
        it("a pattern attribute the browser would ignore can't conflict", () => {
            expect(() => new FormElement({ input: withAttribute("pattern", "("), validation: new FieldValidation({ pattern: "a" }) })).not.toThrow();
        });
        it("minlength '03' matches minChars 3", () => {
            expect(() => new FormElement({ input: withAttribute("minlength", "03"), validation: new FieldValidation({ minChars: 3 }) })).not.toThrow();
        });
        it("maxlength ' 5 ' matches maxChars 5", () => {
            expect(() => new FormElement({ input: withAttribute("maxlength", " 5 "), validation: new FieldValidation({ maxChars: 5 }) })).not.toThrow();
        });
        it("a length attribute the browser would ignore can't conflict", () => {
            expect(() => new FormElement({ input: withAttribute("minlength", "abc"), validation: new FieldValidation({ minChars: 3 }) })).not.toThrow();
        });
        it("a different length still throws", () => {
            expect(() => new FormElement({ input: withAttribute("minlength", "04"), validation: new FieldValidation({ minChars: 3 }) }))
                .toThrowError(`FormElement: the input's minlength attribute ("04") doesn't match "validation.minChars" ("3").`);
        });
    });
});
