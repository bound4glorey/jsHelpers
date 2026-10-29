describe("Validation", () => {

    describe("class is frozen", () => {
        it("types can't be replaced", () => {
            const originalTypes = Validation.types;
            expect(() => { Validation.types = { stringType: "oops" }; }).toThrowError(TypeError);
            expect(Validation.types).toBe(originalTypes);
            expect(Validation.types.stringType).toEqual("string");
        });
        it("a type constant can't be changed", () => {
            expect(() => { Validation.types.stringType = "oops"; }).toThrowError(TypeError);
            expect(Validation.types.stringType).toEqual("string");
        });
        it("isTypeOf can't be overridden", () => {
            const originalIsTypeOf = Validation.isTypeOf;
            expect(() => { Validation.isTypeOf = () => true; }).toThrowError(TypeError);
            expect(Validation.isTypeOf).toBe(originalIsTypeOf);
        });
        it("new static properties can't be added", () => {
            expect(() => { Validation.extra = 1; }).toThrowError(TypeError);
            expect("extra" in Validation).toBe(false);
        });
        it("the class and its prototype report themselves as frozen", () => {
            expect(Object.isFrozen(Validation)).toBe(true);
            expect(Object.isFrozen(Validation.prototype)).toBe(true);
        });
        it("isTypeOf still works after freezing", () => {
            expect(Validation.isTypeOf({ value: "x", type: Validation.types.stringType })).toBe(true);
            expect(Validation.isTypeOf({ value: 1, type: Validation.types.stringType })).toBe(false);
        });
    });

    describe("getError - variableName", () => {
        it("a string name is used in the message", () => {
            expect(Validation.getError({ value: null, variableName: "email" })).toEqual("email is a required field");
        });
        it("no name falls back to 'Given value'", () => {
            expect(Validation.getError({ value: null })).toEqual("Given value is a required field");
        });
        it("a blank name falls back to 'Given value'", () => {
            expect(Validation.getError({ value: null, variableName: "   " })).toEqual("Given value is a required field");
        });
        it("a Symbol name throws", () => {
            expect(() => Validation.getError({ value: null, variableName: Symbol("s") }))
                .toThrowError(`Validation: "variableName", if provided, must be a string.`);
        });
        it("an object name throws", () => {
            expect(() => Validation.getError({ value: null, variableName: {} }))
                .toThrowError(`Validation: "variableName", if provided, must be a string.`);
        });
        it("validateOption rejects a non-string name too", () => {
            expect(() => Validation.validateOption({ value: "x", variableName: 5, type: Validation.types.stringType }))
                .toThrowError(`Validation: "variableName", if provided, must be a string.`);
        });
    });

    describe("isTypeOf - promise", () => {
        const isPromise = (value) => Validation.isTypeOf({ value, type: Validation.types.promiseType });
        it("a real Promise", () => {
            expect(isPromise(Promise.resolve())).toBe(true);
        });
        it("a thenable object", () => {
            expect(isPromise({ then() { } })).toBe(true);
        });
        it("a thenable function", () => {
            const thenable = () => { };
            thenable.then = () => { };
            expect(isPromise(thenable)).toBe(true);
        });
        it("a plain function without then", () => {
            expect(isPromise(() => { })).toBe(false);
        });
        it("an object whose then isn't a function", () => {
            expect(isPromise({ then: 5 })).toBe(false);
        });
        it("null", () => {
            expect(isPromise(null)).toBe(false);
        });
    });

    describe("isValidOption - required defaults to true", () => {
        it("a missing value with no 'required' given counts as missing", () => {
            expect(Validation.isValidOption({ value: null })).toBe(1);
        });
        it("passing required: false explicitly allows a missing value", () => {
            expect(Validation.isValidOption({ value: null, required: false })).toBe(0);
        });
    });

    describe("map, set, error - values from another window", () => {
        let iframe;
        beforeEach(() => {
            iframe = document.createElement("iframe");
            document.body.append(iframe);
        });
        afterEach(() => {
            iframe.remove();
        });
        const is = (value, type) => Validation.isTypeOf({ value, type });

        it("a Map from an iframe is a map", () => {
            expect(is(new iframe.contentWindow.Map(), "map")).toBe(true);
        });
        it("a Set from an iframe is a set", () => {
            expect(is(new iframe.contentWindow.Set(), "set")).toBe(true);
        });
        it("an Error from an iframe is an error", () => {
            expect(is(new iframe.contentWindow.Error("x"), "error")).toBe(true);
        });
        it("same-window values still work, and the types aren't mixed up", () => {
            expect(is(new Map(), "map")).toBe(true);
            expect(is(new Set(), "set")).toBe(true);
            expect(is(new TypeError("x"), "error")).toBe(true);
            expect(is(new Map(), "set")).toBe(false);
            expect(is(new Set(), "map")).toBe(false);
            expect(is(new WeakMap(), "map")).toBe(false);
        });
        it("objects faking the type tag are rejected", () => {
            expect(is({ [Symbol.toStringTag]: "Map" }, "map")).toBe(false);
            expect(is({ [Symbol.toStringTag]: "Set" }, "set")).toBe(false);
            expect(is({ message: "x", name: "Error" }, "error")).toBe(false);
        });
    });

    describe("jsElement - real nodes only", () => {
        const is = (value) => Validation.isTypeOf({ value, type: "jsElement" });
        it("a plain object with a numeric nodeType is rejected", () => {
            expect(is({ nodeType: 1 })).toBe(false);
        });
        it("an object pretending via the prototype is rejected", () => {
            expect(is(Object.create(HTMLInputElement.prototype))).toBe(false);
        });
        it("real nodes of every kind are accepted", () => {
            expect(is(document.createElement("div"))).toBe(true);
            expect(is(document.createTextNode("x"))).toBe(true);
            expect(is(document.createComment("x"))).toBe(true);
            expect(is(document.createDocumentFragment())).toBe(true);
            expect(is(document)).toBe(true);
        });
        it("a node from an iframe is accepted", () => {
            const iframe = document.createElement("iframe");
            document.body.append(iframe);
            const node = iframe.contentDocument.createElement("p");
            iframe.remove();
            expect(is(node)).toBe(true);
        });
    });

    describe("required - blank text counts as missing", () => {
        it("an empty string is missing", () => {
            expect(Validation.getError({ value: "", variableName: "name", type: "string" })).toEqual("name is a required field");
        });
        it("a whitespace-only string is missing", () => {
            expect(Validation.getError({ value: "   ", variableName: "name", type: "string" })).toEqual("name is a required field");
        });
        it("validateOption throws for blank text", () => {
            expect(() => Validation.validateOption({ value: " ", variableName: "name", type: "string" })).toThrowError("name is a required field");
        });
        it("blank text is fine when not required", () => {
            expect(Validation.isValidOption({ value: "", required: false, type: "string" })).toBe(0);
        });
        it("text with content is present", () => {
            expect(Validation.isValidOption({ value: " a ", type: "string" })).toBe(0);
        });
        it("0 and false are present, not missing", () => {
            expect(Validation.isValidOption({ value: 0, type: "number" })).toBe(0);
            expect(Validation.isValidOption({ value: false, type: "boolean" })).toBe(0);
        });
    });
});
