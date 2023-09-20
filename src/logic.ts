import puppeteer from "puppeteer";
import { WebAPITimetable, WebUntis } from "webuntis";
import { log } from "logging";

export async function register_user(
  username: string,
  password: string,
  school_name: string
): Promise<{success: boolean, message: any}> {
  const school = await get_school_from_name(school_name);
  const untis = new WebUntis(
    school.school_name,
    username,
    password,
    school.untis_server
  )

  // Check if the credentials are correct
  try {
    await untis.login();
    await untis.logout();
  } catch (error) {
    const error_message = (error as Error).message;
    return {success: false, message: error_message};
  }

  return {success: true, message: ""};
}

// Get the untis internal school name and the server url
// from the school search on the webuntis website
async function get_school_from_name(
  name: string
): Promise<{ school_name: string; untis_server: string }> {
  log.debug(`Getting school from name: ${name} ...`)

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.goto("https://webuntis.com/");

  const search_input_selector = ".Select-placeholder";
  await page.waitForSelector(search_input_selector);
  await page.type(search_input_selector, name);

  const search_option_selector = ".search-option";
  await page.waitForSelector(search_option_selector);
  await page.click(search_option_selector);

  const untis_sever = page.url().split("/")[2];
  const school_name = page.url().split("/")[4].split("=")[1].replace("+", " ");

  await browser.close();

  log.debug(`Done! School name is ${school_name}`)
  return { school_name: school_name, untis_server: untis_sever };
}
