// deps
import { db } from "./db";
import colors from "irc-colors";
import irc from "irc-framework";
import { users, channels } from "./schema";

const client = new irc.Client({
    nick: process.env.NICK,
    username: process.env.USER,
    gecos: process.env.GECOS,
    host: process.env.NETWORK,
    port: process.env.PORT
});

client.on("registered", () => {
    client.mode(process.env.NICK, `+${process.env.MODES}`);
    client.say("NickServ", `IDENTIFY ${process.env.PASSWORD}`);
});

client.on("message", async (e) => {
    if (e.nick === "NickServ" && e.message.startsWith("Password accepted")) {
        const toJoin = await db.select({ name: channels.name }).from(channels);
        for (const { name } of toJoin) {
            client.join(name);
        }
    }
});

client.on("invite", async (e) => {
    console.log(client.nick);
    if (e.nick === client.nick) {

    }
});

client.connect();