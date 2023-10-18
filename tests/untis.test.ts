import { expect, test } from "bun:test";
import { get_school_from_name, check_credentials } from "untis";
import { User } from "types";

test("get_school_from_name", async () => {
  expect(await get_school_from_name("abc")).toEqual({
    school_name: "Mysen skole",
    untis_server: "korfu.webuntis.com",
  });

  expect(async () => {
    await get_school_from_name("qqqqqqqqqqq");
  }).toThrow("No schools found");
});

test("check_credentials", async () => {
  const user: User = {
    id: "",
    untis_username: "",
    untis_password: "",
    untis_school_name: "",
    untis_server: "",
    untis_qr_data: Bun.env.TEST_UNTIS_QR!,
    timetable: "[]",
    discord_user_id: "",
  };
  expect(await check_credentials(user)).toBe(true);
});
