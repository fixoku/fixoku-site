import { R97G_TEST_IDENTITIES as uiIdentities } from "../../shared/r97g-test-identities.js";

const serverFields = Object.freeze([
  ["testadmin@fixoku.com", "127.0.0.20"],
  ["test1ogrenci@fixoku.com", "127.0.0.21"],
  ["test2ogrenci@fixoku.com", "127.0.0.22"],
  ["test3ogrenci@fixoku.com", "127.0.0.23"],
  ["testogretmen@fixoku.com", "127.0.0.24"],
]);

export const R97G_TEST_IDENTITIES = Object.freeze(uiIdentities.map((identity, index) => Object.freeze({
  ...identity,
  email: serverFields[index][0],
  rateLimitIp: serverFields[index][1],
})));
