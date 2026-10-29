describe("FieldValidation", () => {

    describe("constructor", () => {
        let testElementConfig;
        beforeEach(() => {
            testElementConfig = {};
        });

        describe("container must an object", () => {
            it("valid", () => {
                expect(() => new FieldValidation(testElementConfig)).not.toThrow();
            });

            let errorMessage = `FieldValidation: is missing its "validation" configuration object.`;

            it("string", () => {
                expect(() => new FieldValidation("test")).toThrowError(errorMessage);
            });
            it("number", () => {
                expect(() => new FieldValidation(5)).toThrowError(errorMessage);
            });
            it("boolean", () => {
                expect(() => new FieldValidation(true)).toThrowError(errorMessage);
            });
            it("date", () => {
                expect(() => new FieldValidation(new Date())).toThrow();
            });
            it("object", () => {
                expect(() => new FieldValidation({})).not.toThrow();
            });
            it("array", () => {
                expect(() => new FieldValidation([])).toThrowError(errorMessage);
            });
            it("function", () => {
                expect(() => new FieldValidation(function () { })).toThrowError(errorMessage);
            });
            it("element", () => {
                expect(() => new FieldValidation(document.createElement("input"))).toThrow();
            });

            describe("Special", () => {
                it("No Params", () => {
                    expect(() => new FieldValidation()).not.toThrow();
                });
                it("2 Params", () => {
                    expect(() => new FieldValidation(1, 2)).toThrowError(`FieldValidation: only accepts 1 parameter.`);
                });
            });
        });

        describe("required - required", () => {
            let errorMessage = `FieldValidation: "validation.required", if provided, must be a boolean.`;
            it("valid", () => {
                testElementConfig.required = true;
                expect(() => new FieldValidation(testElementConfig)).not.toThrow();
            });

            it("undefined", () => {
                expect(() => new FieldValidation(testElementConfig)).not.toThrow();
            });
            it("string", () => {
                testElementConfig.required = "test"
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("number", () => {
                testElementConfig.required = 5;
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("boolean", () => {
                testElementConfig.required = true;
                expect(() => new FieldValidation(testElementConfig)).not.toThrow();
            });
            it("date", () => {
                testElementConfig.required = new Date();
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("object", () => {
                testElementConfig.required = {};
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("array", () => {
                testElementConfig.required = [];
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("function", () => {
                testElementConfig.required = function () { };
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("element", () => {
                testElementConfig.required = document.createElement("input");
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
        });

        describe("expectedType - required", () => {
            let errorMessage = `FieldValidation: "validation.expectedType", if provided, must be one of: string, number, boolean, date.`;
            it("valid", () => {
                testElementConfig.expectedType = "string";
                expect(() => new FieldValidation(testElementConfig)).not.toThrow();
            });

            it("string", () => {
                testElementConfig.expectedType = "test"
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("number", () => {
                testElementConfig.expectedType = 5;
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("boolean", () => {
                testElementConfig.expectedType = true;
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("date", () => {
                testElementConfig.expectedType = new Date();
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("object", () => {
                testElementConfig.expectedType = {};
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("array", () => {
                testElementConfig.expectedType = [];
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("function", () => {
                testElementConfig.expectedType = function () { };
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("element", () => {
                testElementConfig.expectedType = document.createElement("label");
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
        });

        describe("minChars - optional", () => {
            let errorMessage = `FieldValidation: "validation.minChars", if provided, must be a whole number greater than 0.`;
            it("valid", () => {
                testElementConfig.minChars = 5;
                expect(() => new FieldValidation(testElementConfig)).not.toThrow();
            });

            it("string", () => {
                testElementConfig.minChars = "test"
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("number", () => {
                testElementConfig.minChars = -1;
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("boolean", () => {
                testElementConfig.minChars = true;
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("date", () => {
                testElementConfig.minChars = new Date();
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("object", () => {
                testElementConfig.minChars = {};
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("array", () => {
                testElementConfig.minChars = [];
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("function", () => {
                testElementConfig.minChars = function () { };
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("element", () => {
                testElementConfig.minChars = document.createElement("label");
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
        });

        describe("maxChars - optional", () => {
            let errorMessage = `FieldValidation: "validation.maxChars", if provided, must be a whole number greater than 0.`;
            it("valid", () => {
                testElementConfig.maxChars = 5;
                expect(() => new FieldValidation(testElementConfig)).not.toThrow();
            });

            it("string", () => {
                testElementConfig.maxChars = "test"
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("number", () => {
                testElementConfig.maxChars = -1;
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("boolean", () => {
                testElementConfig.maxChars = true;
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("date", () => {
                testElementConfig.maxChars = new Date();
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("object", () => {
                testElementConfig.maxChars = {};
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("array", () => {
                testElementConfig.maxChars = [];
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("function", () => {
                testElementConfig.maxChars = function () { };
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("element", () => {
                testElementConfig.maxChars = document.createElement("input");
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
        });

        describe("min - optional", () => {
            let errorMessage = `FieldValidation: "validation.min", if provided, must be a number.`;
            beforeEach(() => {
                testElementConfig.expectedType = "number";
            });
            it("valid", () => {
                testElementConfig.min = 5;
                expect(() => new FieldValidation(testElementConfig)).not.toThrow();
            });

            it("string", () => {
                testElementConfig.min = "test"
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("number", () => {
                testElementConfig.min = NaN;
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("boolean", () => {
                testElementConfig.min = true;
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("date", () => {
                testElementConfig.min = new Date();
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("object", () => {
                testElementConfig.min = {};
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("array", () => {
                testElementConfig.min = [];
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("function", () => {
                testElementConfig.min = function () { };
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("element", () => {
                testElementConfig.min = document.createElement("input");
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });

            describe("other", () => {
                it("min: NaN throws", () => {
                    expect(() => new FieldValidation({ expectedType: "number", min: NaN })).toThrowError(errorMessage);
                });
                it("min: Infinity throws", () => {
                    expect(() => new FieldValidation({ expectedType: "number", min: Infinity })).toThrowError(errorMessage);
                });
                it("min: -Infinity throws", () => {
                    expect(() => new FieldValidation({ expectedType: "number", min: -Infinity })).toThrowError(errorMessage);
                });
                it("min: negative number is valid (unlike minChars)", () => {
                    expect(() => new FieldValidation({ expectedType: "number", min: -10 })).not.toThrow();
                });
                it("min: 0 is valid", () => {
                    expect(() => new FieldValidation({ expectedType: "number", min: 0 })).not.toThrow();
                });
            });
        });

        describe("max - optional", () => {
            let errorMessage = `FieldValidation: "validation.max", if provided, must be a number.`;
            beforeEach(() => {
                testElementConfig.expectedType = "number";
            });
            it("valid", () => {
                testElementConfig.max = 5;
                expect(() => new FieldValidation(testElementConfig)).not.toThrow();
            });

            it("string", () => {
                testElementConfig.max = "test"
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("number", () => {
                testElementConfig.max = NaN;
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("boolean", () => {
                testElementConfig.max = true;
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("date", () => {
                testElementConfig.max = new Date();
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("object", () => {
                testElementConfig.max = {};
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("array", () => {
                testElementConfig.max = [];
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("function", () => {
                testElementConfig.max = function () { };
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("element", () => {
                testElementConfig.max = document.createElement("input");
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            describe("other", () => {
                it("max: NaN throws", () => {
                    expect(() => new FieldValidation({ expectedType: "number", max: NaN })).toThrowError(errorMessage);
                });
                it("max: Infinity throws", () => {
                    expect(() => new FieldValidation({ expectedType: "number", max: Infinity })).toThrowError(errorMessage);
                });
                it("max: -Infinity throws", () => {
                    expect(() => new FieldValidation({ expectedType: "number", max: -Infinity })).toThrowError(errorMessage);
                });
                it("max: negative number is valid (unlike maxChars)", () => {
                    expect(() => new FieldValidation({ expectedType: "number", max: -10 })).not.toThrow();
                });
                it("max: 0 is valid", () => {
                    expect(() => new FieldValidation({ expectedType: "number", max: 0 })).not.toThrow();
                });
            });
        });

        describe("pattern — optional", () => {
            let errorMessage = `FieldValidation: "validation.pattern", if provided, must be a RegExp (or a string that can be compiled into one).`;
            it("valid", () => {
                testElementConfig.pattern = "asd";
                expect(() => new FieldValidation(testElementConfig)).not.toThrow();
            });
            it("valid RegExp", () => {
                testElementConfig.pattern = new RegExp("asd");
                expect(() => new FieldValidation(testElementConfig)).not.toThrow();
            });

            it("string", () => {
                testElementConfig.pattern = "+hello"
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("number", () => {
                testElementConfig.pattern = 5;
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("boolean", () => {
                testElementConfig.pattern = true;
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("date", () => {
                testElementConfig.pattern = new Date();
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("object", () => {
                testElementConfig.pattern = {};
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("array", () => {
                testElementConfig.pattern = [];
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("function", () => {
                testElementConfig.pattern = function () { };
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("element", () => {
                testElementConfig.pattern = document.createElement("input");
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });

        });

        describe("customValidator - optional", () => {
            let errorMessage = `FieldValidation: "validation.customValidator", if provided, must be a function.`;
            it("valid", () => {
                testElementConfig.customValidator = function (value) { };
                expect(() => new FieldValidation(testElementConfig)).not.toThrow();
            });

            it("string", () => {
                testElementConfig.customValidator = "test"
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("number", () => {
                testElementConfig.customValidator = 5;
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("boolean", () => {
                testElementConfig.customValidator = true;
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("date", () => {//dates are objects
                testElementConfig.customValidator = new Date();
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("object", () => {
                testElementConfig.customValidator = {};
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("array", () => {
                testElementConfig.customValidator = [];
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("function", () => {
                testElementConfig.customValidator = function (value) { }; // TODO: test that value is actually passed 
                expect(() => new FieldValidation(testElementConfig)).not.toThrow();
            });
            it("element", () => {//elements are objects
                testElementConfig.customValidator = document.createElement("input");
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
        });

        describe("options - optional", () => {
            let errorMessage = `FieldValidation: "validation.options", if provided, must be an array of values that match the input type.`;
            describe("valid", () => {
                it("string", () => {
                    testElementConfig.options = ["1", "2"];
                    expect(() => new FieldValidation(testElementConfig)).not.toThrow();
                });
                it("number", () => {
                    testElementConfig.options = [1, 2];
                    testElementConfig.expectedType = "number";
                    expect(() => new FieldValidation(testElementConfig)).not.toThrow();
                });
                it("dates", () => {
                    testElementConfig.options = [new Date(2025, 0o5, 0o1), new Date(2025, 0o5, 0o2)];
                    testElementConfig.expectedType = "date";
                    expect(() => new FieldValidation(testElementConfig)).not.toThrow();
                });
            });
            describe("invalid", () => {
                it("expect string - pass number", () => {
                    testElementConfig.options = [1, 2];
                    expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
                });
                it("expect string - pass date", () => {
                    testElementConfig.options = [new Date(2025, 0o5, 0o1), new Date(2025, 0o5, 0o1)];
                    expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
                });
                it("expect number - pass string", () => {
                    testElementConfig.options = ["1", "2"];
                    testElementConfig.expectedType = "number";
                    expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
                });
                it("expect number - pass date", () => {
                    testElementConfig.options = [new Date(2025, 0o5, 0o1), new Date(2025, 0o5, 0o1)];
                    testElementConfig.expectedType = "number";
                    expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
                });
                it("expect date - pass string", () => {
                    testElementConfig.options = ["1", "2"];
                    testElementConfig.expectedType = "date";
                    expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
                });
                it("expect date - pass number", () => {
                    testElementConfig.options = [1, 2];
                    testElementConfig.expectedType = "date";
                    expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
                });
                it("empty array", () => {
                    expect(() => new FieldValidation({ options: [] })).toThrowError(errorMessage);
                });

            });

            describe("expectedType boolean - not allowed", () => {
                let booleanErrorMessage = `FieldValidation: "validation.options" is not allowed when "validation.expectedType" is "boolean" — the value is already restricted to true/false.`;
                beforeEach(() => {
                    testElementConfig.expectedType = "boolean";
                });

                it("no options is valid", () => {
                    expect(() => new FieldValidation(testElementConfig)).not.toThrow();
                });
                it("options: null is valid", () => {
                    testElementConfig.options = null;
                    expect(() => new FieldValidation(testElementConfig)).not.toThrow();
                });
                it("options: undefined is valid", () => {
                    testElementConfig.options = undefined;
                    expect(() => new FieldValidation(testElementConfig)).not.toThrow();
                });
                it("[true, false] throws", () => {
                    testElementConfig.options = [true, false];
                    expect(() => new FieldValidation(testElementConfig)).toThrowError(booleanErrorMessage);
                });
                it("[true] throws", () => {
                    testElementConfig.options = [true];
                    expect(() => new FieldValidation(testElementConfig)).toThrowError(booleanErrorMessage);
                });
                it("empty array throws the boolean error", () => {
                    testElementConfig.options = [];
                    expect(() => new FieldValidation(testElementConfig)).toThrowError(booleanErrorMessage);
                });
                it("non-boolean values throw the boolean error", () => {
                    testElementConfig.options = ["yes", "no"];
                    expect(() => new FieldValidation(testElementConfig)).toThrowError(booleanErrorMessage);
                });
                it("never throws a raw TypeError", () => {
                    testElementConfig.options = [true, false];
                    expect(() => new FieldValidation(testElementConfig)).not.toThrowError(TypeError);
                });
                it("options getter is null", () => {
                    expect(new FieldValidation(testElementConfig).options).toBeNull();
                });
            });

            it("string", () => {
                testElementConfig.options = "test"
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("number", () => {
                testElementConfig.options = 5;
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("boolean", () => {
                testElementConfig.options = true;
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("date", () => {//dates are objects
                testElementConfig.options = new Date();
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("object", () => {
                testElementConfig.options = {};
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("array", () => {
                testElementConfig.options = [];
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("function", () => {
                testElementConfig.options = function () { };
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
            it("element", () => {//elements are objects
                testElementConfig.options = document.createElement("input");
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });

            it("array of numbers", () => {
                testElementConfig.options = [1, 2];
                expect(() => new FieldValidation(testElementConfig)).toThrowError(errorMessage);
            });
        });
    });


    describe("getter functions", () => {
        describe("options - mutation safety", () => {
            it("mutating the returned array does not affect the instance", () => {
                const testElementClass = new FieldValidation({ options: ["a", "b"] });
                const opts = testElementClass.options;
                opts.push("c");
                expect(testElementClass.options).toEqual(["a", "b"]);
            });

            it("returns a new array reference on every access", () => {
                const testElementClass = new FieldValidation({ options: ["a", "b"] });
                expect(testElementClass.options).not.toBe(testElementClass.options);
            });
        });

        describe("required", () => {
            it("match", () => {
                let testElementClass = new FieldValidation({ required: true });
                expect(testElementClass.required).toBe(true);
            });

            it("no match", () => {
                let testElementClass = new FieldValidation({ required: true });
                expect(testElementClass.required).not.toBe(false);
            });
        });

        describe("expectedType", () => {
            it("match", () => {
                let testElementClass = new FieldValidation({ expectedType: "number" });
                expect(testElementClass.expectedType).toEqual("number");
            });

            it("no match", () => {
                let testElementClass = new FieldValidation({ expectedType: "number" });
                expect(testElementClass.expectedType).not.toEqual("string");
            });
        });

        describe("minChars", () => {
            it("match", () => {
                let testElementClass = new FieldValidation({ minChars: 2 });
                expect(testElementClass.minChars).toEqual(2);
            });

            it("no match", () => {
                let testElementClass = new FieldValidation({ minChars: 2 });
                expect(testElementClass.minChars).not.toEqual("2");
            });
        });

        describe("maxChars", () => {
            it("match", () => {
                let testElementClass = new FieldValidation({ maxChars: 2 });
                expect(testElementClass.maxChars).toEqual(2);
            });

            it("no match", () => {
                let testElementClass = new FieldValidation({ maxChars: 2 });
                expect(testElementClass.maxChars).not.toEqual("2");
            });
        });

        describe("min", () => {
            it("match", () => {
                let testElementClass = new FieldValidation({ expectedType: "number", min: 2 });
                expect(testElementClass.min).toEqual(2);
            });

            it("no match", () => {
                let testElementClass = new FieldValidation({ expectedType: "number", min: 2 });
                expect(testElementClass.min).not.toEqual("2");
            });
        });

        describe("max", () => {
            it("match", () => {
                let testElementClass = new FieldValidation({ expectedType: "number", max: 2 });
                expect(testElementClass.max).toEqual(2);
            });

            it("no match", () => {
                let testElementClass = new FieldValidation({ expectedType: "number", max: 2 });
                expect(testElementClass.max).not.toEqual("2");
            });
        });

        describe("pattern", () => {
            it("match", () => {
                let testElementClass = new FieldValidation({ pattern: "asd" });
                expect(testElementClass.pattern).toEqual(/asd/);
            });

            it("no match", () => {
                let testElementClass = new FieldValidation({ pattern: "asd" });
                expect(testElementClass.pattern).not.toEqual(/asdf/);
            });
        });

        describe("customValidator", () => {
            it("match", () => {
                let testFunction = function () { };
                let testElementClass = new FieldValidation({ customValidator: testFunction });
                expect(testElementClass.customValidator).toEqual(testFunction);
            });

            it("no match", () => {
                let testFunction = function () { };
                let testElementClass = new FieldValidation({ customValidator: testFunction });
                expect(testElementClass.customValidator).not.toEqual({ "option": 2 });
            });
        });

        describe("options", () => {
            it("match", () => {
                let testSettings = ["option1", "option2"];
                let testElementClass = new FieldValidation({ options: testSettings });
                expect(testElementClass.options).toEqual(testSettings);
            });

            it("no match", () => {
                let testSettings = ["option1", "option2"];
                let testElementClass = new FieldValidation({ options: testSettings });
                expect(testElementClass.options).not.toEqual(["option1", "option3"]);
            });
        });
    });

    describe("unknown keys", () => {
        it("a misspelled key throws instead of being silently ignored", () => {
            expect(() => new FieldValidation({ requried: true }))
                .toThrowError(`FieldValidation: unknown option(s) "requried". Allowed: required, expectedType, minChars, maxChars, min, max, pattern, customValidator, options.`);
        });
        it("lists every unknown key", () => {
            expect(() => new FieldValidation({ requried: true, maxchars: 5 }))
                .toThrowError(/unknown option\(s\) "requried", "maxchars"\./);
        });
        it("every allowed key together is valid", () => {
            expect(() => new FieldValidation({
                required: true, expectedType: "string", minChars: 1, maxChars: 5,
                min: null, max: null, pattern: "a", customValidator: () => [], options: ["a"]
            })).not.toThrow();
        });
    });

    describe("rules must fit expectedType", () => {
        const notAllowed = (rule, type) => `FieldValidation: "validation.${rule}" is not allowed when "validation.expectedType" is "${type}".`;

        it("string allows minChars, maxChars, pattern", () => {
            expect(() => new FieldValidation({ expectedType: "string", minChars: 1, maxChars: 5, pattern: "a" })).not.toThrow();
        });
        it("string rejects min", () => {
            expect(() => new FieldValidation({ expectedType: "string", min: 5 })).toThrowError(notAllowed("min", "string"));
        });
        it("string rejects max", () => {
            expect(() => new FieldValidation({ expectedType: "string", max: 5 })).toThrowError(notAllowed("max", "string"));
        });
        it("number allows min, max", () => {
            expect(() => new FieldValidation({ expectedType: "number", min: 1, max: 5 })).not.toThrow();
        });
        it("number rejects minChars", () => {
            expect(() => new FieldValidation({ expectedType: "number", minChars: 3 })).toThrowError(notAllowed("minChars", "number"));
        });
        it("number rejects pattern", () => {
            expect(() => new FieldValidation({ expectedType: "number", pattern: "\\d" })).toThrowError(notAllowed("pattern", "number"));
        });
        it("boolean rejects minChars", () => {
            expect(() => new FieldValidation({ expectedType: "boolean", minChars: 3 })).toThrowError(notAllowed("minChars", "boolean"));
        });
        it("boolean rejects min", () => {
            expect(() => new FieldValidation({ expectedType: "boolean", min: 1 })).toThrowError(notAllowed("min", "boolean"));
        });
        it("boolean rejects pattern", () => {
            expect(() => new FieldValidation({ expectedType: "boolean", pattern: "x" })).toThrowError(notAllowed("pattern", "boolean"));
        });
        it("null/undefined rules are fine for any type", () => {
            expect(() => new FieldValidation({ expectedType: "boolean", minChars: null, min: undefined, pattern: null })).not.toThrow();
        });
        it("required and customValidator are allowed for every type", () => {
            ["string", "number", "boolean", "date"].forEach(expectedType => {
                expect(() => new FieldValidation({ expectedType, required: true, customValidator: () => [] })).not.toThrow();
            });
        });
    });

    describe("minChars/maxChars - whole numbers and ordering", () => {
        it("decimal minChars throws", () => {
            expect(() => new FieldValidation({ minChars: 2.5 }))
                .toThrowError(`FieldValidation: "validation.minChars", if provided, must be a whole number greater than 0.`);
        });
        it("decimal maxChars throws", () => {
            expect(() => new FieldValidation({ maxChars: 2.5 }))
                .toThrowError(`FieldValidation: "validation.maxChars", if provided, must be a whole number greater than 0.`);
        });
        it("minChars greater than maxChars throws", () => {
            expect(() => new FieldValidation({ minChars: 10, maxChars: 2 }))
                .toThrowError(`FieldValidation: "validation.minChars" must not be greater than "validation.maxChars".`);
        });
        it("minChars equal to maxChars is valid", () => {
            expect(() => new FieldValidation({ minChars: 3, maxChars: 3 })).not.toThrow();
        });
    });

    describe("min/max - ordering", () => {
        const errorMessage = `FieldValidation: "validation.min" must not be greater than "validation.max".`;
        it("number min greater than max throws", () => {
            expect(() => new FieldValidation({ expectedType: "number", min: 10, max: 5 })).toThrowError(errorMessage);
        });
        it("number min equal to max is valid", () => {
            expect(() => new FieldValidation({ expectedType: "number", min: 5, max: 5 })).not.toThrow();
        });
        it("negative range is valid", () => {
            expect(() => new FieldValidation({ expectedType: "number", min: -10, max: -1 })).not.toThrow();
        });
        it("date min after max throws", () => {
            expect(() => new FieldValidation({ expectedType: "date", min: new Date(2026, 5, 1), max: new Date(2026, 0, 1) })).toThrowError(errorMessage);
        });
    });

    describe("min/max - date fields", () => {
        it("Date bounds are valid", () => {
            expect(() => new FieldValidation({ expectedType: "date", min: new Date(2026, 0, 1), max: new Date(2026, 11, 31) })).not.toThrow();
        });
        it("a number bound throws", () => {
            expect(() => new FieldValidation({ expectedType: "date", min: 5 }))
                .toThrowError(`FieldValidation: "validation.min", if provided, must be a valid Date.`);
        });
        it("an Invalid Date bound throws", () => {
            expect(() => new FieldValidation({ expectedType: "date", max: new Date("nope") }))
                .toThrowError(`FieldValidation: "validation.max", if provided, must be a valid Date.`);
        });
        it("a Date bound on a number field throws", () => {
            expect(() => new FieldValidation({ expectedType: "number", min: new Date() }))
                .toThrowError(`FieldValidation: "validation.min", if provided, must be a number.`);
        });
        it("mutating the original Date does not change the instance", () => {
            const min = new Date(2026, 0, 1);
            const fieldValidation = new FieldValidation({ expectedType: "date", min });
            min.setFullYear(1999);
            expect(fieldValidation.min.getFullYear()).toBe(2026);
        });
        it("mutating the returned Date does not change the instance", () => {
            const fieldValidation = new FieldValidation({ expectedType: "date", max: new Date(2026, 0, 1) });
            fieldValidation.max.setFullYear(1999);
            expect(fieldValidation.max.getFullYear()).toBe(2026);
        });
    });

    describe("pattern - safety", () => {
        it("an uncompilable string keeps the browser's SyntaxError as the cause", () => {
            try {
                new FieldValidation({ pattern: "(" });
                fail("expected a throw");
            } catch (error) {
                expect(error instanceof SyntaxError).toBe(false);
                expect(error.cause instanceof SyntaxError).toBe(true);
            }
        });
        it("the g flag is stripped so .test() is consistent", () => {
            const pattern = new FieldValidation({ pattern: /abc/g }).pattern;
            expect([pattern.test("abc"), pattern.test("abc"), pattern.test("abc")]).toEqual([true, true, true]);
        });
        it("the y flag is stripped", () => {
            expect(new FieldValidation({ pattern: /abc/y }).pattern.flags).toBe("");
        });
        it("other flags are kept", () => {
            expect(new FieldValidation({ pattern: /abc/gi }).pattern.flags).toBe("i");
        });
        it("the stored RegExp is not the caller's object", () => {
            const original = /a/;
            expect(new FieldValidation({ pattern: original }).pattern).not.toBe(original);
        });
        it("returns a new RegExp on every access", () => {
            const fieldValidation = new FieldValidation({ pattern: "a" });
            expect(fieldValidation.pattern).not.toBe(fieldValidation.pattern);
        });
    });

    describe("options - safety", () => {
        it("mutating the original array does not change the instance", () => {
            const options = ["a", "b"];
            const fieldValidation = new FieldValidation({ options });
            options.push("HACKED");
            expect(fieldValidation.options).toEqual(["a", "b"]);
        });
        it("duplicate values throw", () => {
            expect(() => new FieldValidation({ options: ["a", "a"] }))
                .toThrowError(`FieldValidation: "validation.options" must not contain duplicate values.`);
        });
        it("duplicate dates (same time, different objects) throw", () => {
            expect(() => new FieldValidation({ expectedType: "date", options: [new Date(2026, 0, 1), new Date(2026, 0, 1)] }))
                .toThrowError(`FieldValidation: "validation.options" must not contain duplicate values.`);
        });
        it("mutating a returned Date option does not change the instance", () => {
            const fieldValidation = new FieldValidation({ expectedType: "date", options: [new Date(2026, 0, 1)] });
            fieldValidation.options[0].setFullYear(1999);
            expect(fieldValidation.options[0].getFullYear()).toBe(2026);
        });
    });

    describe("options - must agree with the other rules", () => {
        it("a number option above max throws", () => {
            expect(() => new FieldValidation({ expectedType: "number", options: [1, 50], max: 10 }))
                .toThrowError(`FieldValidation: "validation.options" contains value(s) that "validation.max" would always reject: 50.`);
        });
        it("a number option below min throws", () => {
            expect(() => new FieldValidation({ expectedType: "number", options: [-5, 1], min: 0 }))
                .toThrowError(`FieldValidation: "validation.options" contains value(s) that "validation.min" would always reject: -5.`);
        });
        it("date options vs min/max are left to FormElement (which knows if it's a date or datetime field)", () => {
            expect(() => new FieldValidation({
                expectedType: "date",
                options: [new Date(2026, 0, 1), new Date(2030, 0, 1)],
                max: new Date(2027, 0, 1)
            })).not.toThrow();
        });
        it("a string option longer than maxChars throws", () => {
            expect(() => new FieldValidation({ options: ["ok", "waytoolong"], maxChars: 3 }))
                .toThrowError(`FieldValidation: "validation.options" contains value(s) that "validation.maxChars" would always reject: "waytoolong".`);
        });
        it("a string option shorter than minChars throws", () => {
            expect(() => new FieldValidation({ options: ["a", "abc"], minChars: 2 }))
                .toThrowError(`FieldValidation: "validation.options" contains value(s) that "validation.minChars" would always reject: "a".`);
        });
        it("a string option that fails pattern throws", () => {
            expect(() => new FieldValidation({ options: ["abc", "123"], pattern: "^\\d+$" }))
                .toThrowError(`FieldValidation: "validation.options" contains value(s) that "validation.pattern" would always reject: "abc".`);
        });
        it("options that satisfy every rule are valid", () => {
            expect(() => new FieldValidation({ options: ["12", "345"], minChars: 2, maxChars: 3, pattern: "^\\d+$" })).not.toThrow();
            expect(() => new FieldValidation({ expectedType: "number", options: [0, 5, 10], min: 0, max: 10 })).not.toThrow();
        });
    });

    describe("options - string values must be matchable", () => {
        const errorMessage = `FieldValidation: "validation.options" must not contain blank values or values with leading/trailing spaces.`;
        it("an empty string throws", () => {
            expect(() => new FieldValidation({ options: ["", "a"] })).toThrowError(errorMessage);
        });
        it("a whitespace-only string throws", () => {
            expect(() => new FieldValidation({ options: ["   ", "a"] })).toThrowError(errorMessage);
        });
        it("leading/trailing spaces throw", () => {
            expect(() => new FieldValidation({ options: [" a", "b "] })).toThrowError(errorMessage);
        });
        it("inner spaces are fine", () => {
            expect(() => new FieldValidation({ options: ["New York", "Los Angeles"] })).not.toThrow();
        });
    });

    describe("customValidator - must be callable synchronously", () => {
        it("an async function throws", () => {
            expect(() => new FieldValidation({ customValidator: async () => [] }))
                .toThrowError(`FieldValidation: "validation.customValidator" must not be async — it is called synchronously and must return an array of error messages.`);
        });
        it("an async generator throws", () => {
            expect(() => new FieldValidation({ customValidator: async function* () { } }))
                .toThrowError(/must not be async/);
        });
        it("a generator throws", () => {
            expect(() => new FieldValidation({ customValidator: function* () { } }))
                .toThrowError(`FieldValidation: "validation.customValidator" must not be a generator — it must return an array of error messages.`);
        });
        it("a class throws", () => {
            expect(() => new FieldValidation({ customValidator: class Foo { } }))
                .toThrowError(`FieldValidation: "validation.customValidator" must be a function, not a class.`);
        });
        it("arrow, regular, and bound functions are valid", () => {
            expect(() => new FieldValidation({ customValidator: () => [] })).not.toThrow();
            expect(() => new FieldValidation({ customValidator: function () { return []; } })).not.toThrow();
            expect(() => new FieldValidation({ customValidator: (function () { return []; }).bind(null) })).not.toThrow();
        });
        it("a function whose name starts with 'class' is not mistaken for a class", () => {
            expect(() => new FieldValidation({ customValidator: function classify() { return []; } })).not.toThrow();
        });
    });

    describe("pattern - RegExp from another window", () => {
        it("an iframe's RegExp is accepted", () => {
            const iframe = document.createElement("iframe");
            document.body.append(iframe);
            const foreignPattern = new iframe.contentWindow.RegExp("^a+$", "g");
            iframe.remove();
            const pattern = new FieldValidation({ pattern: foreignPattern }).pattern;
            expect(pattern.source).toEqual("^a+$");
            expect(pattern.flags).toEqual("");
        });
    });

    describe("immutability - instances are frozen", () => {
        it("a getter can't be overridden with defineProperty", () => {
            const fieldValidation = new FieldValidation({ required: true });
            expect(() => Object.defineProperty(fieldValidation, "required", { value: false })).toThrowError(TypeError);
            expect(fieldValidation.required).toBe(true);
        });
        it("new properties can't be added", () => {
            const fieldValidation = new FieldValidation();
            expect(() => { fieldValidation.extra = 1; }).toThrowError(TypeError);
            expect("extra" in fieldValidation).toBe(false);
        });
        it("the instance reports itself as frozen", () => {
            expect(Object.isFrozen(new FieldValidation())).toBe(true);
        });
        it("a subclass can still add its own fields", () => {
            class TaggedFieldValidation extends FieldValidation {
                tag = "custom";
            }
            expect(new TaggedFieldValidation({ required: true }).tag).toEqual("custom");
        });
    });

    describe("values from another window (iframe)", () => {
        let iframe;
        beforeEach(() => {
            iframe = document.createElement("iframe");
            document.body.append(iframe);
        });
        afterEach(() => {
            iframe.remove();
        });

        it("a Date bound is accepted, and copied into this window", () => {
            const fieldValidation = new FieldValidation({ expectedType: "date", min: new iframe.contentWindow.Date(2026, 0, 1) });
            expect(fieldValidation.min instanceof Date).toBe(true);
            expect(fieldValidation.min.getFullYear()).toBe(2026);
        });
        it("a Date option is accepted", () => {
            expect(() => new FieldValidation({ expectedType: "date", options: [new iframe.contentWindow.Date(2026, 0, 1)] })).not.toThrow();
        });
        it("duplicate Date options from different windows are still caught", () => {
            expect(() => new FieldValidation({ expectedType: "date", options: [new Date(2026, 0, 1), new iframe.contentWindow.Date(2026, 0, 1)] }))
                .toThrowError(`FieldValidation: "validation.options" must not contain duplicate values.`);
        });
        it("a plain config object is accepted", () => {
            const config = new iframe.contentWindow.Object();
            config.required = true;
            expect(new FieldValidation(config).required).toBe(true);
        });
        it("an object faking the Date tag is still rejected", () => {
            const fake = { [Symbol.toStringTag]: "Date" };
            expect(() => new FieldValidation({ expectedType: "date", min: fake }))
                .toThrowError(`FieldValidation: "validation.min", if provided, must be a valid Date.`);
        });
    });

    describe("customValidator - class detection edge cases", () => {
        it("a class with a comment right after 'class' throws", () => {
            expect(() => new FieldValidation({ customValidator: class/*comment*/Foo { } }))
                .toThrowError(`FieldValidation: "validation.customValidator" must be a function, not a class.`);
        });
        it("an anonymous class with no space throws", () => {
            expect(() => new FieldValidation({ customValidator: class{ } }))
                .toThrowError(`FieldValidation: "validation.customValidator" must be a function, not a class.`);
        });
        it("a method named 'class' is not mistaken for a class", () => {
            const holder = { class() { return []; } };
            expect(() => new FieldValidation({ customValidator: holder.class })).not.toThrow();
        });
        it("a method named 'classify' is not mistaken for a class", () => {
            const holder = { classify() { return []; } };
            expect(() => new FieldValidation({ customValidator: holder.classify })).not.toThrow();
        });
    });

    describe("options - sparse arrays", () => {
        it("a hole in the middle throws", () => {
            // eslint-disable-next-line no-sparse-arrays
            expect(() => new FieldValidation({ options: ["a", , "b"] }))
                .toThrowError(`FieldValidation: "validation.options" must not contain empty slots (found one at index 1).`);
        });
        it("an array created with a length but no values throws", () => {
            expect(() => new FieldValidation({ options: new Array(2) }))
                .toThrowError(`FieldValidation: "validation.options" must not contain empty slots (found one at index 0).`);
        });
        it("an explicit undefined is rejected as the wrong type, not as a hole", () => {
            expect(() => new FieldValidation({ options: ["a", undefined] }))
                .toThrowError(`FieldValidation: "validation.options", if provided, must be an array of values that match the input type.`);
        });
    });

    describe("pattern - empty", () => {
        const errorMessage = `FieldValidation: "validation.pattern", if provided, must not be empty (an empty pattern matches everything).`;
        it("an empty string throws", () => {
            expect(() => new FieldValidation({ pattern: "" })).toThrowError(errorMessage);
        });
        it("an empty RegExp throws", () => {
            expect(() => new FieldValidation({ pattern: new RegExp("") })).toThrowError(errorMessage);
        });
        it("a pattern of just a space is not empty", () => {
            expect(() => new FieldValidation({ pattern: " " })).not.toThrow();
        });
    });

    describe("minChars/maxChars - upper limit", () => {
        it("minChars above 2147483647 throws", () => {
            expect(() => new FieldValidation({ minChars: 2147483648 }))
                .toThrowError(`FieldValidation: "validation.minChars" must not be greater than 2147483647.`);
        });
        it("maxChars above 2147483647 throws", () => {
            expect(() => new FieldValidation({ maxChars: 1e21 }))
                .toThrowError(`FieldValidation: "validation.maxChars" must not be greater than 2147483647.`);
        });
        it("exactly 2147483647 is valid", () => {
            expect(() => new FieldValidation({ maxChars: 2147483647 })).not.toThrow();
        });
    });

    describe("immutability - subclasses, the prototype, and the class", () => {
        it("a subclass instance's getter can't be overridden with defineProperty", () => {
            class TaggedFieldValidation extends FieldValidation { }
            const instance = new TaggedFieldValidation({ required: true });
            expect(() => Object.defineProperty(instance, "required", { value: false })).toThrowError(TypeError);
            expect(instance.required).toBe(true);
        });
        it("a prototype getter can't be replaced", () => {
            expect(() => Object.defineProperty(FieldValidation.prototype, "required", { get: () => false })).toThrowError(TypeError);
            expect(new FieldValidation({ required: true }).required).toBe(true);
        });
        it("the class can't gain new static properties", () => {
            expect(() => { FieldValidation.extra = 1; }).toThrowError(TypeError);
        });
        it("the instance still looks empty to Object.keys and JSON", () => {
            const fieldValidation = new FieldValidation({ required: true });
            expect(Object.keys(fieldValidation)).toEqual([]);
            expect(JSON.stringify(fieldValidation)).toEqual("{}");
        });
    });

    describe("config - read exactly once", () => {
        it("a getter that throws gets a FieldValidation error, with the original as cause", () => {
            const config = { get required() { throw new Error("boom"); } };
            try {
                new FieldValidation(config);
                fail("expected a throw");
            } catch (error) {
                expect(error.message).toEqual(`FieldValidation: the configuration object could not be read.`);
                expect(error.cause.message).toEqual("boom");
            }
        });
        it("a getter is read only once", () => {
            let reads = 0;
            const config = { get required() { reads++; return true; } };
            expect(new FieldValidation(config).required).toBe(true);
            expect(reads).toBe(1);
        });
        it("a getter that changes its answer can't slip a bad value past the checks", () => {
            let reads = 0;
            const config = { get minChars() { reads++; return reads === 1 ? 3 : -1; } };
            expect(new FieldValidation(config).minChars).toBe(3);
        });
    });
});
