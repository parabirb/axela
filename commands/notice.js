import { env } from "node:process";
import { isOP } from "../admin.js";

async function noticeHandler(
    client,
    event,
    argv,
    { db, userCache, channels, eq, channelQuery },
) {
    if (argv.length !== 3) {
        client.say(
            event.nick,
            `Incorrect usage. See ${env.PREFIX}notice who for more info.`,
        );
        return;
    }

    const user = userCache.findOne({
        nick: event.nick,
    });

    if (
        user &&
        Object.keys(user.channels).includes(argv[1]) &&
        isOP(user.channels[argv[1]].modes)
    ) {
        if (argv[2] === "on" || argv[2] === "off") {
            await db
                .update(channels)
                .set({ noticesEnabled: argv[2] === "on" })
                .where(eq(channels.name, argv[1]));
            client.say(
                event.nick,
                `The notice preference in ${argv[1]} has been updated.`,
            );
        } else if (argv[2] === "show") {
            const channel = await channelQuery.execute({
                name: argv[2],
            });
            if (channel)
                client.say(
                    event.nick,
                    `Notices are ${channel.noticesEnabled ? "enabled" : "disabled"} in ${argv[1]}`,
                );
            else client.say(event.nick, "I'm not in that channel!");
        } else {
            client.say(event.nick, "Unknown parameters.");
        }
    } else {
        client.say(event.nick, "You can't do that.");
    }
}

const notice = {
    name: "notice",
    usage: "[channel] [on | off | show] ",
    description:
        "Intended for use by channel ops. Turns notices for unregistered users on or off in a specified channel, or displays the status.",
    handler: noticeHandler,
};

export default notice;
