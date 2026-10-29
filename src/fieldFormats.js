// =====================================================================
// Text formats for the time, month, and week field types — parsed here
// rather than left to the browser, because not every browser implements
// these inputs (Firefox shows a plain text box for "month" and "week",
// which accepts any text and has no range check). Used by FormBuilder
// and FormValidator so both read these values the same way. Internal:
// not exported from src/index.js.
// =====================================================================

const PATTERNS = {
    "time": /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/,
    "month": /^(\d{4,})-(\d{2})$/,
    "week": /^(\d{4,})-W(\d{2})$/
};

/**
 * An example of each format, for error messages.
 * @type {Readonly<Record<"time" | "month" | "week", string>>}
 */
export const TEXT_FORMAT_EXAMPLES = Object.freeze({
    "time": "09:30",
    "month": "2026-06",
    "week": "2026-W23"
});

/**
 * Whether `type` is one of the field types whose value is text in a fixed
 * format with a range (time, month, week).
 * @param {string} type
 * @returns {boolean}
 */
export function isTextFormatType(type) {
    return Object.hasOwn(PATTERNS, type);
}

// How many ISO weeks a year has: 53 if it starts on a Thursday, or is a
// leap year starting on a Wednesday; otherwise 52.
function isoWeeksInYear(year) {
    const januaryFirst = new Date(0);
    januaryFirst.setUTCFullYear(year, 0, 1);
    const weekday = januaryFirst.getUTCDay(); // 0 = Sunday
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return weekday === 4 || (isLeapYear && weekday === 3) ? 53 : 52;
}

/**
 * Parses a time ("09:30", "09:30:15", "09:30:15.5"), month ("2026-06"),
 * or week ("2026-W23") value into a number that sorts the same way the
 * values do, or null if it isn't a real value of that type — e.g. month
 * 13, week 53 in a year that has 52, or 24:00.
 * @param {"time" | "month" | "week"} type
 * @param {string} text
 * @returns {number | null}
 */
export function parseTextFormat(type, text) {
    if (typeof text !== "string") {
        return null;
    }
    const parts = PATTERNS[type]?.exec(text);
    if (!parts) {
        return null;
    }
    if (type === "time") {
        const [hours, minutes, seconds = 0] = parts.slice(1, 4).map(part => Number(part ?? 0));
        const milliseconds = parts[4] === undefined ? 0 : Number(parts[4].padEnd(3, "0"));
        if (hours > 23 || minutes > 59 || seconds > 59) {
            return null;
        }
        return ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds;
    }
    const year = Number(parts[1]);
    const unit = Number(parts[2]);
    if (year < 1) {
        return null;
    }
    if (type === "month") {
        return unit >= 1 && unit <= 12 ? year * 12 + (unit - 1) : null;
    }
    return unit >= 1 && unit <= isoWeeksInYear(year) ? year * 53 + unit : null;
}
