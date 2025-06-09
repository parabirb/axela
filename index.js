// Deps
import { process } from "node:process";
import loki from "lokijs";
import irc from "irc-framework";
import { eq } from "drizzle-orm";
import { db } from "./db.js";
// Import colors from "irc-colors";
import { channels } from "./schema.js";

// Create our irc client with env params
const client = new irc.Client({
    nick: process.env.NICK,
    username: process.env.USER,
    gecos: process.env.GECOS,
    host: process.env.NETWORK,
    port: process.env.PORT,
    tls: Boolean(process.env.TLS),
    rejectUnauthorized: process.env.TLS === "verify",
});

// In-memory database for the user cache
const memdb = new loki(); // eslint-disable-line new-cap
const userCache = memdb.addCollection("users", {
    unique: ["nick"],
});

// Once we're registered with the server, we need to set modes then ident
client.on("registered", () => {
    client.mode(process.env.NICK, `+${process.env.MODES}`);
    client.say("NickServ", `IDENTIFY ${process.env.PASSWORD}`);
});

// Message handler
client.on("message", async (event) => {
    // If we're logged in
    if (event.nick === "NickServ" && event.message.startsWith("Password accepted")) {
        console.log("Logged into IRC");
        // Join all the channels in our db
        const toJoin = await db.select({ name: channels.name }).from(channels);
        for (const { name } of toJoin) {
            client.join(name);
        }
    }
});

client.on("invite", async (event) => {
    // We want to join channels we're invited to
    if (event.invited === process.env.NICK) {
        await db.insert(channels).values({ name: event.channel });
        client.join(event.channel);
    }
});

client.on("kick", async (event) => {
    // And leave channels we're not welcome in
    if (event.kicked === process.env.NICK) {
        await db.delete(channels).where(eq(channels.name, event.channel));
        for (const user of userCache.find({
            channels: {
                $contains: event.channel,
            },
        })) {
            if (Object.keys(user.channels).length === 1) {
                userCache.remove(user);
            } else {
                delete user.channels[event.channel];
                userCache.update(user);
            }
        }
    }
    // Plus update user cache if someone gets kicked
    else {
        const cachedUser = userCache.findOne({
            nick: event.kicked,
        });
        if (cachedUser.channels.length === 1) {
            userCache.remove(cachedUser);
        } else {
            delete cachedUser.channels[event.channel];
            userCache.update(cachedUser);
        }
    }
});

client.on("join", (event) => {
    console.log(event);
    // If it's us, we need to do our WHO polling
    if (event.nick === process.env.NICK) {
        client.who(event.channel);
    }
    // Otherwise, we need to update our cache
    else {
        const cachedUser = userCache.findOne({
            nick: event.nick,
        });
        if (cachedUser) {
            cachedUser.channels[event.channel] = [];
            userCache.update(cachedUser);
        } else {
            const channels = {};
            channels[event.channel] = [];
            userCache.insertOne({
                nick: event.nick,
                away: false,
                channels,
            });
            // Need to run a whois if the user isn't already in our cache so we can detect away status
            client.whois(event.nick);
        }
    }
});

client.on("part", (event) => {
    const cachedUser = userCache.findOne({
        nick: event.nick,
    });
    if (cachedUser.channels.length === 1) {
        userCache.remove(cachedUser);
    } else {
        delete cachedUser.channels[event.channel];
        userCache.update(cachedUser);
    }
});

client.on("quit", (event) => {
    userCache.findAndRemove({
        nick: event.nick,
    });
});

client.on("nick", (event) => {
    const cachedUser = userCache.findOne({
        nick: event.nick,
    });
    if (cachedUser) {
        userCache.remove(cachedUser);
        cachedUser.nick = event.new_nick;
        userCache.insertOne(cachedUser);
        // TODO: redo greetings
    }
});

client.on("whois", (event) => {
    const cachedUser = userCache.findOne({
        nick: event.nick,
    });
    // People can theoretically part before our whois finishes, so just in case, we'll wrap this in an if statement
    if (cachedUser) {
        if (event.away) {
            cachedUser.away = true;
        }

        userCache.update(cachedUser);
    }
});

client.on("away", (event) => {
    const cachedUser = userCache.findOne({
        nick: event.nick,
    });
    if (cachedUser) {
        cachedUser.away = true;
        userCache.update(cachedUser);
    }
});

client.on("back", (event) => {
    const cachedUser = userCache.findOne({
        nick: event.nick,
    });
    if (cachedUser) {
        cachedUser.away = false;
        userCache.update(cachedUser);
    }
});

client.on("wholist", (event) => {
    console.log(event);
    for (const user of event.users) {
        // We don't want to put ourselves in the cache
        if (user.nick === process.env.NICK) {
            continue;
        }

        const cachedUser = userCache.findOne({
            nick: user.nick,
        });
        if (cachedUser) {
            cachedUser.channels[user.channel] = user.channel_modes;
            userCache.update(cachedUser);
        } else {
            // The channels prop for each user is an object bc it gives us easy indexing and access to channel modes
            const channels = {};
            channels[user.channel] = user.channel_modes;
            userCache.insertOne({
                nick: user.nick,
                away: user.away,
                channels,
            });
        }
    }

    console.log(event.users.find((user) => user.channel_modes.length > 0));
});

client.connect();
