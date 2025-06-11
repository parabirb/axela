import { db } from "./db.js";
import { channels } from "./schema.js";

await db.insert(channels).values({
    // No seed values here
});
