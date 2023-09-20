import { WebAPITimetable, WebUntis } from "webuntis";
import { log } from "logging";

export async function register_user(
  username: string,
  password: string,
  school_name: string
) {
  log.debug(username, password, school_name);
}

async function get_school_from_name(name: string) {
}
