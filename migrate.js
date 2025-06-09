import { db } from "./db.js";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

migrate(db, { migrationsFolder: "./drizzle" });
