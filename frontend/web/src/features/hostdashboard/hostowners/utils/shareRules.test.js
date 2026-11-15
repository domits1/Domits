import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";
import { ARCHIVED_OWNER_STATUS, SETTABLE_OWNER_STATUSES } from "./ownerFormRules";
import { DAY_MS, latestEffectiveFrom, todayUtc, utcMidnightToDateInput } from "./utcDate";
import {
  SHARE_ERROR_KEYS,
  buildSetSharesPayload,
  currentSplitForProperty,
  hasPlannedChange,
  plannedChangeFrom,
  propertyChoices,
  selectableOwners,
  shareTotalBasisPoints,
  validateShares,
} from "./shareRules";
import cases from "./shareRules.cases.json";

const NOW = Date.UTC(2026, 10, 10, 15, 30);
const TODAY_INPUT = "2026-11-10";
const PLANNED_DATE = Date.UTC(2026, 11, 1);
const LANGUAGES = Object.freeze({ en, nl, de, es });

const share = (propertyId, basisPoints, effectiveTo = null) => ({
  property_id: propertyId,
  property_title: `Title of ${propertyId}`,
  ownership_basis_points: basisPoints,
  effective_from: Date.UTC(2026, 6, 1),
  effective_to: effectiveTo,
});

const owner = (id, status, properties) => ({ id, first_name: id, last_name: "Owner", status, properties });

const OWNERS = Object.freeze([
  owner("owner-a", "active", [share("property-1", 6000), share("property-2", 10000)]),
  owner("owner-b", "inactive", [share("property-1", 4000)]),
  owner("owner-c", "pending", []),
  owner("owner-d", ARCHIVED_OWNER_STATUS, []),
  owner("owner-e", "active", undefined),
]);

const rowsFor = (percents) => percents.map((percent, index) => ({ ownerId: `owner-${index + 1}`, percent }));

const validForm = (overrides = {}) => ({
  propertyId: "property-1",
  dateInput: TODAY_INPUT,
  rows: rowsFor(["60", "40"]),
  ...overrides,
});

const errorKeysOf = (value) =>
  typeof value === "string" ? [value] : Object.values(value).flatMap((entry) => errorKeysOf(entry));

const keyPaths = (value, prefix = "") =>
  Object.entries(value).flatMap(([key, entry]) =>
    typeof entry === "object" ? keyPaths(entry, `${prefix}${key}.`) : [`${prefix}${key}`]
  );

describe("currentSplitForProperty", () => {
  test("groups the current shares of every owner by property", () => {
    expect(currentSplitForProperty(OWNERS, "property-1")).toEqual([
      { ownerId: "owner-a", percent: "60", effectiveTo: null },
      { ownerId: "owner-b", percent: "40", effectiveTo: null },
    ]);
    expect(currentSplitForProperty(OWNERS, "property-2")).toEqual([
      { ownerId: "owner-a", percent: "100", effectiveTo: null },
    ]);
  });

  test("skips owners without shares and returns nothing for a property without owners", () => {
    expect(currentSplitForProperty(OWNERS, "property-3")).toEqual([]);
    expect(currentSplitForProperty([owner("owner-c", "active", [])], "property-1")).toEqual([]);
    expect(currentSplitForProperty(undefined, "property-1")).toEqual([]);
  });

  test.each([
    [3333, "33.33"],
    [5050, "50.5"],
    [1, "0.01"],
    [33.5, ""],
    [null, ""],
  ])("turns %p basis points into the input text %p", (basisPoints, percent) => {
    const [row] = currentSplitForProperty(
      [owner("owner-a", "active", [share("property-1", basisPoints)])],
      "property-1"
    );

    expect(row.percent).toBe(percent);
  });

  test("keeps the end of a period and treats a missing end as open", () => {
    const owners = [
      owner("owner-a", "active", [share("property-1", 6000, PLANNED_DATE)]),
      owner("owner-b", "active", [{ property_id: "property-1", ownership_basis_points: 4000 }]),
    ];

    expect(currentSplitForProperty(owners, "property-1").map((row) => row.effectiveTo)).toEqual([PLANNED_DATE, null]);
  });
});

describe("selectableOwners", () => {
  test("leaves out archived owners and keeps every settable status", () => {
    const selectable = selectableOwners(OWNERS);

    expect(selectable.map((entry) => entry.id)).toEqual(["owner-a", "owner-b", "owner-c", "owner-e"]);
    expect(selectable.some((entry) => entry.status === ARCHIVED_OWNER_STATUS)).toBe(false);
    SETTABLE_OWNER_STATUSES.forEach((status) => {
      expect(selectableOwners([owner("owner-x", status, [])])).toHaveLength(1);
    });
  });

  test("returns an empty list for a missing owner list", () => {
    expect(selectableOwners(null)).toEqual([]);
  });
});

describe("planned changes", () => {
  test("finds no planned change when every current period is open", () => {
    expect(hasPlannedChange(OWNERS, "property-1")).toBe(false);
    expect(plannedChangeFrom(OWNERS, "property-1")).toBeNull();
  });

  test("finds a planned change when a current period has an end date, and returns the earliest", () => {
    const later = PLANNED_DATE + 10 * DAY_MS;
    const owners = [
      owner("owner-a", "active", [share("property-1", 6000, later)]),
      owner("owner-b", "active", [share("property-1", 4000, PLANNED_DATE)]),
      owner("owner-c", "active", [share("property-2", 10000)]),
    ];

    expect(hasPlannedChange(owners, "property-1")).toBe(true);
    expect(plannedChangeFrom(owners, "property-1")).toBe(PLANNED_DATE);
    expect(hasPlannedChange(owners, "property-2")).toBe(false);
  });
});

describe("shareTotalBasisPoints", () => {
  test("adds up the valid shares and ignores invalid ones", () => {
    expect(shareTotalBasisPoints(rowsFor(["33.33", "33.33", "33.34"]))).toBe(10000);
    expect(shareTotalBasisPoints(rowsFor(["50", "abc", "", "33.333", "25.5"]))).toBe(7550);
    expect(shareTotalBasisPoints(rowsFor(["33,33", "66,67", "1,000"]))).toBe(10000);
    expect(shareTotalBasisPoints(undefined)).toBe(0);
  });
});

describe("validateShares", () => {
  test("accepts a complete form", () => {
    expect(validateShares(validForm(), NOW)).toEqual({});
  });

  test.each(cases.percent)("%s gives %p", (_label, percents, expected) => {
    expect(validateShares(validForm({ rows: rowsFor(percents) }), NOW)).toEqual(expected);
  });

  test.each(cases.date)("a date of %s (%p) gives %p", (_label, dateInput, expected) => {
    const errors = validateShares(validForm({ dateInput }), NOW);

    expect(errors.date ?? null).toBe(expected);
  });

  test("the date cases are built on the shared date limits", () => {
    expect(utcMidnightToDateInput(todayUtc(NOW))).toBe(TODAY_INPUT);
    expect(utcMidnightToDateInput(latestEffectiveFrom(NOW))).toBe("2031-11-10");
  });

  test("uses the UTC date, not the local date", () => {
    expect(validateShares(validForm(), Date.UTC(2026, 10, 10, 23, 59))).toEqual({});
    expect(validateShares(validForm(), Date.UTC(2026, 10, 11, 0, 1))).toEqual({ date: "dateBeforeToday" });
  });

  test.each([[""], ["   "], [undefined], [null]])("asks for a property when it is %p", (propertyId) => {
    expect(validateShares(validForm({ propertyId }), NOW)).toEqual({ property: "propertyRequired" });
  });

  test.each([[[]], [undefined]])("refuses an empty owner list (%p)", (rows) => {
    expect(validateShares(validForm({ rows }), NOW)).toEqual({ shares: "sharesRequired" });
  });

  test("marks every later row of an owner that is already in the list, in any letter case", () => {
    const rows = [
      { ownerId: "owner-1", percent: "50" },
      { ownerId: "OWNER-1", percent: "25" },
      { ownerId: "owner-1", percent: "25" },
    ];

    expect(validateShares(validForm({ rows }), NOW)).toEqual({
      rows: { 1: { owner: "ownerDuplicate" }, 2: { owner: "ownerDuplicate" } },
    });
  });

  test.each([[""], ["  "], [undefined]])("asks for an owner when the owner id is %p", (ownerId) => {
    const rows = [{ ownerId, percent: "100" }];

    expect(validateShares(validForm({ rows }), NOW)).toEqual({ rows: { 0: { owner: "ownerRequired" } } });
  });

  test("reports the owner and the share of one row together, next to the other errors", () => {
    const rows = [{ ownerId: "", percent: "0" }];

    expect(validateShares({ propertyId: "", dateInput: "", rows }, NOW)).toEqual({
      property: "propertyRequired",
      date: "dateRequired",
      rows: { 0: { owner: "ownerRequired", percent: "percentZero" } },
    });
  });
});

describe("buildSetSharesPayload", () => {
  test("builds exactly the three fields setShares sends", () => {
    const payload = buildSetSharesPayload({
      propertyId: " property-1 ",
      dateInput: "2026-12-01",
      rows: [
        { ownerId: " owner-1 ", percent: "33,33" },
        { ownerId: "owner-2", percent: " 66.67 " },
      ],
    });

    expect(payload).toEqual({
      property_id: "property-1",
      effective_from: Date.UTC(2026, 11, 1),
      shares: [
        { owner_id: "owner-1", ownership_basis_points: 3333 },
        { owner_id: "owner-2", ownership_basis_points: 6667 },
      ],
    });
    expect(Object.keys(payload)).toEqual(["property_id", "effective_from", "shares"]);
    payload.shares.forEach((entry) => expect(Object.keys(entry)).toEqual(["owner_id", "ownership_basis_points"]));
  });
});

describe("propertyChoices", () => {
  test("maps the property options to a value and the title, and skips options without an id", () => {
    const options = [
      {
        value: "property-1",
        title: "Villa Kalimaya III",
        label: "Villa Kalimaya III - Bali, Indonesia",
        status: "ACTIVE",
      },
      { value: " property-2 ", title: "  ", label: "anything" },
      { value: "", title: "No id" },
      { title: "Missing id" },
    ];

    expect(propertyChoices(options, en.hostOwners.unknownProperty)).toEqual([
      { value: "property-1", label: "Villa Kalimaya III" },
      { value: "property-2", label: en.hostOwners.unknownProperty },
    ]);
  });

  test("returns an empty list for missing options", () => {
    expect(propertyChoices(undefined, en.hostOwners.unknownProperty)).toEqual([]);
  });
});

describe("share texts", () => {
  const producedKeys = [
    ...cases.percent.flatMap(([, percents]) =>
      errorKeysOf(validateShares(validForm({ rows: rowsFor(percents) }), NOW))
    ),
    ...cases.date.flatMap(([, dateInput]) => errorKeysOf(validateShares(validForm({ dateInput }), NOW))),
    ...errorKeysOf(validateShares({ propertyId: "", dateInput: "", rows: [] }, NOW)),
    ...errorKeysOf(
      validateShares(
        validForm({
          rows: [
            { ownerId: "", percent: "100" },
            { ownerId: "", percent: "" },
          ],
        }),
        NOW
      )
    ),
    ...errorKeysOf(
      validateShares(validForm({ rows: rowsFor(["50", "50"]).map(() => ({ ownerId: "owner-1", percent: "50" })) }), NOW)
    ),
  ];

  test("every key the rules return is a known share error key, and every known key is reachable", () => {
    expect(new Set(producedKeys)).toEqual(new Set(SHARE_ERROR_KEYS));
  });

  test.each(Object.keys(LANGUAGES))("%s has a text for every share error key", (language) => {
    const { errors } = LANGUAGES[language].hostOwners.shares;

    SHARE_ERROR_KEYS.forEach((key) => {
      expect(typeof errors[key]).toBe("string");
      expect(errors[key].trim()).not.toBe("");
    });
  });

  test.each(["nl", "de", "es"])("%s has the same share keys as en, and is translated", (language) => {
    const shares = LANGUAGES[language].hostOwners.shares;

    expect(keyPaths(shares)).toEqual(keyPaths(en.hostOwners.shares));
    expect(shares.title).not.toBe(en.hostOwners.shares.title);
    expect(shares.errors.totalMismatch).not.toBe(en.hostOwners.shares.errors.totalMismatch);
  });

  test.each(Object.keys(LANGUAGES))("%s keeps the placeholders in the share templates", (language) => {
    const shares = LANGUAGES[language].hostOwners.shares;

    expect(shares.savedToast).toContain("{date}");
    expect(shares.savedToast).toContain("{property}");
    expect(shares.plannedChangeWarning).toContain("{date}");
    expect(shares.removeOwnerLabel).toContain("{name}");
    expect(shares.totalValue).toContain("{percent}");
  });
});
