// Deps
import { env } from "node:process";
import irc from "irc-framework";
import Loki from "lokijs";
import { eq, sql } from "drizzle-orm";
import colors from "irc-colors";
import { db } from "./db.js";
import { users, channels } from "./schema.js";
import { getIntro, getDesc } from "./greetings.js";
import commands from "./commands.js";

// Create our irc client with env params
const client = new irc.Client({
    nick: env.NICK,
    username: env.USER,
    gecos: env.GECOS,
    host: env.NETWORK,
    port: env.PORT,
    tls: Boolean(env.TLS),
    rejectUnauthorized: env.TLS === "verify",
});

// In-memory database for the user cache
const memdb = new Loki();
const userCache = memdb.addCollection("users", {
    unique: ["nick"],
});
const greetCache = memdb.addCollection("greetings");
const bottleCache = memdb.addCollection("bottles");

// Run tasks to clear the greet and bottle caches occasionally
function clearGreetCache() {
    greetCache.findAndRemove({
        time: {
            $lte: Date.now() + 3600 * 1000 * Number(env.GREET_COOLDOWN),
        },
    });
}

function clearBottleCache() {
    bottleCache.findAndRemove({
        time: {
            $lte: Date.now() + 1000 * Number(env.BOTTLE_COOLDOWN),
        },
    });
}

setInterval(
    () => {
        clearGreetCache();
        clearBottleCache();
    },
    60 * 1000 * Number(env.CACHE_CLEAR),
);

// Prepared query for specific things--improves perf or smth, idk
const userQuery = db.query.users
    .findFirst({
        where: (users) => eq(users.nick, sql.placeholder("nick")),
    })
    .prepare();
const channelQuery = db.query.channels
    .findFirst({
        where: (users) => eq(users.name, sql.placeholder("name")),
    })
    .prepare();

// Once we're registered with the server, we need to set modes then ident
client.on("registered", () => {
    client.mode(env.NICK, `+${env.MODES}`);
    client.say("NickServ", `IDENTIFY ${env.PASSWORD}`);
});

// Message handler
client.on("message", async (event) => {
    // If we're logged in
    if (
        event.nick === "NickServ" &&
        event.message.startsWith("Password accepted")
    ) {
        console.log("Logged into IRC.");
        // Join all the channels in our db
        const toJoin = await db.select({ name: channels.name }).from(channels);
        for (const { name } of toJoin) {
            client.join(name);
        }
    }
});

client.on("invite", async (event) => {
    // We want to join channels we're invited to
    if (event.invited === env.NICK) {
        await db.insert(channels).values({ name: event.channel });
        client.join(event.channel);
    }
});

client.on("kick", async (event) => {
    // And leave channels we're not welcome in
    if (event.kicked === env.NICK) {
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

client.on("join", async (event) => {
    // If it's us, we need to do our WHO polling
    if (event.nick === env.NICK) {
        client.who(event.channel);
    }
    // Otherwise, we need to update our cache and potentially greet
    else {
        const sqlUser = await userQuery.execute({
            nick: event.nick.toLowerCase(),
        });
        const cachedUser = userCache.findOne({
            nick: event.nick,
        });
        const cachedGreet = greetCache.findOne({
            nick: event.nick,
            channel: event.channel,
        });
        if (cachedUser) {
            cachedUser.channels[event.channel] = {
                modes: [],
            };
            userCache.update(cachedUser);
        } else {
            const channels = {};
            channels[event.channel] = {
                modes: [],
            };
            userCache.insertOne({
                nick: event.nick,
                away: false,
                channels,
                bottle: Boolean(sqlUser?.bottle),
            });
            // Need to run a whois if the user isn't already in our cache so we can detect away status
            client.whois(event.nick);
        }

        if (
            sqlUser &&
            (!cachedGreet ||
                cachedGreet.time + 3600 * 1000 * Number(env.GREET_COOLDOWN) <=
                    Date.now())
        ) {
            client.action(
                event.channel,
                `${getIntro()} "${colors.blue(event.nick)}, ${getDesc(sqlUser)}"`,
            );
            greetCache.insertOne({
                nick: event.nick,
                channel: event.channel,
                time: Date.now(),
            });
            return;
        }

        if (!sqlUser) {
            const channel = await channelQuery.execute({ name: event.channel });
            if (channel.noticesEnabled) client.notice(event.nick, env.NOTICE);
        }
    }
});

client.on("part", (event) => {
    const cachedUser = userCache.findOne({
        nick: event.nick,
    });
    if (cachedUser?.channels.length === 1) {
        userCache.remove(cachedUser);
    } else if (cachedUser) {
        delete cachedUser.channels[event.channel];
        userCache.update(cachedUser);
    }
});

client.on("quit", (event) => {
    userCache.findAndRemove({
        nick: event.nick,
    });
});

client.on("nick", async (event) => {
    const cachedUser = userCache.findOne({
        nick: event.nick,
    });
    if (cachedUser) {
        userCache.remove(cachedUser);
        cachedUser.nick = event.new_nick;
        userCache.insertOne(cachedUser);
        const sqlUser = await userQuery.execute({
            nick: event.new_nick.toLowerCase(),
        });
        if (sqlUser) {
            for (const channel of Object.keys(cachedUser.channels)) {
                const cachedGreet = greetCache.findOne({
                    nick: event.new_nick,
                    channel,
                });
                if (
                    !cachedGreet ||
                    cachedGreet.time +
                        3600 * 1000 * Number(env.GREET_COOLDOWN) <=
                        Date.now()
                ) {
                    client.action(
                        channel,
                        `${getIntro()} "${colors.blue(event.new_nick)}, ${getDesc(sqlUser)}"`,
                    );
                    greetCache.insertOne({
                        nick: event.new_nick,
                        channel,
                        time: Date.now(),
                    });
                }
            }
        }
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

client.on("wholist", async (event) => {
    // eslint hates me :(
    const promises = [];
    for (const user of event.users) {
        // We don't want to put ourselves in the cache
        if (user.nick === env.NICK) {
            continue;
        }

        const cachedUser = userCache.findOne({
            nick: user.nick,
        });
        if (cachedUser) {
            cachedUser.channels[user.channel] = {
                modes: user.channel_modes,
            };
            userCache.update(cachedUser);
        } else {
            const channels = {};
            channels[user.channel] = {
                modes: user.channel_modes,
            };
            userCache.insertOne({
                nick: user.nick,
                away: user.away,
                channels,
            });
            promises.push(
                (async () => {
                    const sqlUser = await userQuery.execute({
                        nick: user.nick.toLowerCase(),
                    });
                    const updatedUser = userCache.findOne({ nick: user.nick });
                    if (sqlUser?.bottle) {
                        updatedUser.bottle = true;
                        db.update(updatedUser);
                    }
                })(),
            );
        }
    }

    await Promise.all(promises);
});

client.on("privmsg", async (event) => {
    event.message = event.message.trim();
    if (event.message.startsWith(env.PREFIX)) {
        const argv = event.message.split(" ");
        argv[0] = argv[0].replace(env.PREFIX, "");
        const command = commands.find((command) => command.name === argv[0]);
        if (command)
            command.handler(client, event, argv, {
                db,
                userQuery,
                channelQuery,
                userCache,
                bottleCache,
                commands,
                channels,
                users,
                eq,
                colors,
            });
        else {
            try {
                await commands
                    .find((command) => command.name === "help")
                    .handler(client, event, ["help"], {
                        commands,
                    });
            } catch (error) {
                console.log(`Encountered error: ${error}
Event: ${JSON.stringify(event)}`);
            }
        }
    } else if (
        env.MIGRATION &&
        event.nick === "Alexa" &&
        /^.+ is: .+$/.test(event.message)
    ) {
        const splitMessage = event.message.split(" is: ");
        if (
            !(await userQuery.execute({ nick: splitMessage[0].toLowerCase() }))
        ) {
            const parsedDesc = splitMessage.slice(1).join(" is: ").split(" (");
            await db.insert(users).values({
                nick: splitMessage[0].toLowerCase(),
                desc: parsedDesc
                    .slice(0, parsedDesc.length > 1 ? parsedDesc.length - 1 : 1)
                    .join(" ("),
            });
            client.say(
                splitMessage[0],
                `Your description has been migrated to ${env.NICK}. If you have an image and/or link in your Alexa description, you'll have to set it separately. You should also remove your description from Alexa after fully setting up your Axela profile, so that you don't get greeted twice.`,
            );
            const cachedUser = userCache.findOne({ nick: splitMessage[0] });
            if (cachedUser) {
                cachedUser.bottle = true;
                userCache.update(cachedUser);
            }
        }
    } else if (event.target === env.NICK && event.nick !== "Alexa") {
        client.say(
            event.nick,
            `I don't understand what you're trying to do. You can say ${env.PREFIX}help for help.`,
        );
    }
});

client.connect();
