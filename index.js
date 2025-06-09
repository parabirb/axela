// deps
import loki from "lokijs";
import { db } from "./db.js";
import colors from "irc-colors";
import irc from "irc-framework";
import { eq } from "drizzle-orm";
import { users, channels } from "./schema.js";

// create our irc client with env params
const client = new irc.Client({
    nick: process.env.NICK,
    username: process.env.USER,
    gecos: process.env.GECOS,
    host: process.env.NETWORK,
    port: process.env.PORT,
    tls: !!process.env.TLS,
    rejectUnauthorized: process.env.TLS === "verify",
});

// in-memory database for the user cache
const memdb = new loki();
const userCache = memdb.addCollection("users", {
    unique: ["nick"],
});

// once we're registered with the server, we need to set modes then ident
client.on("registered", () => {
    client.mode(process.env.NICK, `+${process.env.MODES}`);
    client.say("NickServ", `IDENTIFY ${process.env.PASSWORD}`);
});

// message handler
client.on("message", async (e) => {
    // if we're logged in
    if (e.nick === "NickServ" && e.message.startsWith("Password accepted")) {
        console.log("Logged into IRC");
        // join all the channels in our db
        const toJoin = await db.select({ name: channels.name }).from(channels);
        for (const { name } of toJoin) {
            client.join(name);
        }
    }
});

client.on("invite", async (e) => {
    // we want to join channels we're invited to
    if (e.invited === process.env.NICK) {
        await db.insert(channels).values({ name: e.channel });
        client.join(e.channel);
    }
});

client.on("kick", async (e) => {
    // and leave channels we're not welcome in
    if (e.kicked === process.env.NICK) {
        await db.delete(channels).where(eq(channels.name, e.channel));
        userCache
            .find({
                channels: {
                    $contains: e.channel,
                },
            })
            .forEach((user) => {
                if (Object.keys(user.channels).length === 1)
                    userCache.remove(user);
                else {
                    delete user.channels[e.channel];
                    userCache.update(user);
                }
            });
    }
});

client.on("join", (e) => {
    console.log(e);
    // if it's us, we need to do our WHO polling
    if (e.nick === process.env.NICK) {
        client.who(e.channel);
    }
    // otherwise, we need to update our cache
    else {
        const cachedUser = userCache.findOne({
            nick: e.nick,
        });
        if (cachedUser) {
            cachedUser.channels[e.channel] = [];
            userCache.update(cachedUser);
        } else {
            const channels = {};
            channels[e.channel] = [];
            userCache.insertOne({
                nick: e.nick,
                away: false,
                channels,
            });
            // need to run a whois if the user isn't already in our cache so we can detect away status
            client.whois(e.nick);
        }
    }
});

client.on("away", (e) => {
    const cachedUser = userCache.findOne({
        nick: e.nick,
    });
    if (cachedUser) {
        cachedUser.away = true;
        userCache.update(cachedUser);
    }
});

client.on("back", (e) => {
    const cachedUser = userCache.findOne({
        nick: e.nick,
    });
    if (cacheduser) {
        cachedUser.away = false;
        userCache.update(cachedUser);
    }
});

client.on("wholist", (e) => {
    console.log(e);
    for (const user of e.users) {
        // we don't want to put ourselves in the cache
        if (user.nick === process.env.NICK) continue;
        const cachedUser = userCache.findOne({
            nick: user.nick,
        });
        if (cachedUser) {
            cachedUser.channels[user.channel] = user.channel_modes;
            userCache.update(cachedUser);
        } else {
            // the channels prop for each user is an object bc it gives us easy indexing and access to channel modes
            const channels = {};
            channels[user.channel] = user.channel_modes;
            userCache.insertOne({
                nick: user.nick,
                away: user.away,
                channels,
            });
        }
    }
    console.log(e.users.filter((user) => user.channel_modes.length !== 0)[0]);
});

client.connect();
