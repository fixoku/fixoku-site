// R97G synthetic review identities. These are labels and routing metadata only;
// passwords stay in the local/staging secret path and are never bundled.
export const R97G_TEST_IDENTITIES = Object.freeze([
  Object.freeze({
    slug: "r97g-test-admin",
    name: "FIXOKU Test Admin",
    role: "SUPER_ADMIN",
    roleLabel: "Admin · sentetik test",
    redirect: "/panel/admin",
    initials: "TA",
  }),
  Object.freeze({
    slug: "r97g-test-student-1",
    name: "FIXOKU Test Öğrenci 1",
    role: "STUDENT",
    roleLabel: "Öğrenci 1 · sentetik test",
    redirect: "/panel/ogrenci",
    initials: "Ö1",
  }),
  Object.freeze({
    slug: "r97g-test-student-2",
    name: "FIXOKU Test Öğrenci 2",
    role: "STUDENT",
    roleLabel: "Öğrenci 2 · sentetik test",
    redirect: "/panel/ogrenci",
    initials: "Ö2",
  }),
  Object.freeze({
    slug: "r97g-test-student-3",
    name: "FIXOKU Test Öğrenci 3",
    role: "STUDENT",
    roleLabel: "Öğrenci 3 · sentetik test",
    redirect: "/panel/ogrenci",
    initials: "Ö3",
  }),
  Object.freeze({
    slug: "r97g-test-trainer",
    name: "FIXOKU Test Eğitmen",
    role: "TRAINER",
    roleLabel: "Eğitmen · sentetik test",
    redirect: "/panel/egitmen",
    initials: "TE",
  }),
]);
