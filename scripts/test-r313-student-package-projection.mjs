import assert from "node:assert/strict";
import {
  collapseStudentPackageCards as collapse
} from "../src/server/domain/student-package-projection.js";

const row = (id, version, state, extra = {}) => ({
  packageId: id,
  packageVersionId: `${id}-${version}`,
  versionNumber: version,
  accessState: state,
  ...extra
});

const cases = [
  {
    name: "Only current published",
    input: [row("A", 6, "AVAILABLE")],
    expected: ["A-6"]
  },
  {
    name: "Old grant overrides available card",
    input: [
      row("A", 4, "OWNED"),
      row("A", 5, "OWNED"),
      row("A", 6, "AVAILABLE")
    ],
    expected: ["A-5"]
  },
  {
    name: "Current owned overrides historical",
    input: [
      row("A", 4, "OWNED"),
      row("A", 6, "OWNED")
    ],
    expected: ["A-6"]
  },
  {
    name: "Pending stays visible",
    input: [
      row("A", 4, "PENDING_PAYMENT"),
      row("A", 5, "AVAILABLE")
    ],
    expected: ["A-4"]
  },
  {
    name: "Newer available version",
    input: [
      row("A", 4, "AVAILABLE"),
      row("A", 6, "AVAILABLE")
    ],
    expected: ["A-6"]
  },
  {
    name: "Different packages preserved",
    input: [
      row("A", 4, "OWNED"),
      row("A", 6, "AVAILABLE"),
      row("B", 3, "AVAILABLE")
    ],
    expected: ["A-4", "B-3"]
  },
  {
    name: "Owner source preserved",
    input: [
      row("A", 4, "OWNED", {
        ownershipId: "grant-4",
        ownershipSourceType: "OWNER_MANUAL"
      }),
      row("A", 6, "AVAILABLE")
    ],
    expected: ["A-4"]
  },
  {
    name: "No packages",
    input: [],
    expected: []
  }
];

for (const test of cases) {
  const actual = collapse(test.input);
  assert.deepEqual(
    actual.map(x => x.packageVersionId),
    test.expected,
    test.name
  );
  if (test.name === "Owner source preserved") {
    assert.equal(actual[0].ownershipId, "grant-4");
    assert.equal(actual[0].ownershipSourceType, "OWNER_MANUAL");
  }
  console.log(`PASS ${test.name}`);
}
assert.throws(() => collapse(null), /STUDENT_PACKAGES_INVALID/);
console.log("R313=PASS; CASES=8");