import { expect, test } from "bun:test";
import { get_school_from_name } from "logic";

test("get_school_from_name", async () => {
  expect(await get_school_from_name("abc")).toBe({
    school_name: "Mysen skole",
    untis_server: "korfu.webuntis.com",
  });
});
