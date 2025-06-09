import { env } from "node:process";
import { randomBytes } from "node:crypto";

async function bottleHandler(
    client,
    event,
    argv,
    { db, userCache, bottleCache, users, userQuery, eq, colors }
) {
    if (argv.length === 1) {
        if (event.target.startsWith("#")) {
            const cachedBottle = bottleCache.findOne({
                nick: event.nick,
                channel: event.target,
            });
            if (
                !cachedBottle ||
                cachedBottle.time + 1000 * Number(env.BOTTLE_COOLDOWN) <=
                    Date.now()
            ) {
                const bottleUsers = userCache.find({
                    nick: {
                        $ne: event.nick,
                    },
                    channels: {
                        $contains: event.target,
                    },
                    away: false,
                    bottle: true,
                });
                if (bottleUsers.length < 2) {
                    client.say(
                        event.nick,
                        `There aren't enough free users in ${event.target} to run the bottle command.`
                    );
                } else {
                    const user =
                        bottleUsers[
                            randomBytes(4).readUInt32BE(0) % bottleUsers.length
                        ];
                    client.action(
                        event.target,
                        `spin-spin-spins the bottle... and it lands on ${colors.red(user.nick)}!`
                    );
                    bottleCache.insertOne({
                        nick: event.nick,
                        channel: event.target,
                        time: Date.now(),
                    });
                }
            } else {
                client.say(
                    event.nick,
                    `You need to wait before trying to run the bottle command in ${event.target} again.`
                );
            }
        } else {
            client.say(
                event.nick,
                "When running with no arguments, this command will only work in a channel."
            );
        }
    } else if (argv.length === 2) {
        const user = await userQuery.execute({
            nick: event.nick.toLowerCase(),
        });
        if (!user) {
            client.say(event.nick, "You need a profile to set preferences!");
        } else if (argv[1] === "on" || argv[1] === "off") {
            const bottle = argv[1] === "on";
            await db
                .update(users)
                .set({ bottle })
                .where(eq(users.nick, event.nick.toLowerCase()));
            userCache.findAndUpdate({ nick: event.nick }, (user) => {
                user.bottle = bottle;
                return user;
            });
            client.say(event.nick, "Your preference has been recorded.");
        } else if (argv[1] === "status") {
            client.say(
                event.nick,
                `You have bottle spins ${user.bottle ? "enabled" : "disabled"}.`
            );
        } else {
            client.say(event.nick, "Unrecognized parameters.");
        }
    } else {
        client.say(event.nick, "Unrecognized parameters.");
    }
}

const bottle = {
    name: "bottle",
    usage: "[on | off | status] ",
    description:
        "When used in a channel with no arguments, it'll select a random user. On and off allow you to opt in and out of bottle spins (users are opted in by default), and status will display your saved preference.",
    handler: bottleHandler,
};

export default bottle;
