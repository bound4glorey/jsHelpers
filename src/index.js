// =====================================================================
// jsHelpers — form building and validation.
//
// The package entry point (package.json "main"). Import what you need:
//   import { FormBuilder, FormValidator } from "./src/index.js";
//
// Loading this file also sets every class as a global (and the older
// lowercase aliases), so pages and specs that use the globals keep
// working:
//   <script type="module" src="src/index.js"></script>
// =====================================================================
import { Validation } from "./validation.js";
import { FieldValidation } from "./fieldValidation.js";
import { FormElement } from "./formElement.js";
import { FormBuilder, FormBuilderForm } from "./formBuilder.js";
import { FormValidator } from "./formValidator.js";

export { Validation, FieldValidation, FormElement, FormBuilder, FormBuilderForm, FormValidator };

// Globals, for code that doesn't import. Set on globalThis rather than
// window, so this also loads where there is no window (Node, a worker).
Object.assign(globalThis, { Validation, FieldValidation, FormElement, FormBuilder, FormBuilderForm, FormValidator });

// Older lowercase aliases.
Object.assign(globalThis, {
    fieldValidation: FieldValidation,
    formElement: FormElement,
    formControls: FormBuilder,
    formValidator: FormValidator
});
