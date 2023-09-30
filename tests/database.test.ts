import { Database } from "bun:sqlite";
import { test } from "bun:test";

test("connection", () => {
  const db = new Database("database/database.db");
  db.close();
});
