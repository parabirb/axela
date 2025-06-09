import { env } from "node:process";

async function noticeHandler(
    client,
    event,
    argv,
    { db, userCache, channels, eq, channelQuery }
) {
    if (argv.length !== 3) {
        client.say(
            event.nick,
            `Incorrect usage. See ${env.PREFIX}notice who for more info.`
        );
        return;
    }

    const user = userCache.findOne({
        nick: event.nick,
    });

    if (
        Object.keys(user.channels).includes(argv[1]) &&
        (user.channels[argv[1]].modes.includes("q") ||
            user.channels[argv[1]].modes.includes("o") ||
            user.channels[argv[1]].modes.includes("a"))
    ) {
        if (argv[2] === "on" || argv[2] === "off") {
            await db
                .update(channels)
                .set({ noticesEnabled: argv[2] === "on" })
                .where(eq(channels.name, argv[1]));
            client.say(
                event.nick,
                `The notice preference in ${argv[1]} has been updated.`
            );
        } else if (argv[2] === "show") {
            const channel = await channelQuery.execute({
                name: argv[2],
            });
            client.say(
                event.nick,
                `Notices are ${channel.noticesEnabled ? "enabled" : "disabled"} in ${argv[1]}`
            );
        } else {
            client.say(event.nick, "Unknown parameters.");
        }
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
