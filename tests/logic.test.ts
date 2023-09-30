import { expect, test } from "bun:test";
import { get_school_from_name } from "logic";

test("get_existing_school_from_name", async () => {
  expect(await get_school_from_name("abc")).toEqual({
    school_name: "Mysen skole",
    untis_server: "korfu.webuntis.com",
  });
});

test("get_nonexisting_school_from_name", async () => {
  expect(async () => {
    await get_school_from_name("qqqqqqqqqqq");
  }).toThrow("No schools found");
});
