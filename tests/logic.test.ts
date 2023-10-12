import { expect, test } from "bun:test";
import { get_school_from_name, filter_cancelled_lessons } from "logic";
import { Lesson } from "types";

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

test("filter_canceled_lessons", () => {
  const date_string = "2023-10-12T10:10:00.000Z";

  const new_timetable: Lesson[] = [
    {
      id: 1,
      cancelled: true,
      date: new Date(date_string),
      name: "Math",
    },
  ];
  const old_timetable: Lesson[] = [
    {
      id: 1,
      cancelled: false,
      date: new Date(date_string),
      name: "Math",
    },
  ];

  expect(filter_cancelled_lessons(new_timetable, old_timetable)).toEqual([
    {
      id: 1,
      cancelled: true,
      date: new Date(date_string),
      name: "Math",
    },
  ]);
});
