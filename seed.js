import { db } from "./db";
import { channels } from "./schema";

await db.insert(channels).values({
    name: "#raisedtailscafe"
});