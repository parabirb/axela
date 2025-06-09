import { env } from "node:process";

async function imgHandler(client, event, argv, { db, userQuery, users, eq }) {
    if (argv.length !== 2) {
        client.say(
            event.nick,
            `Incorrect usage. See ${env.PREFIX}help img for more info.`
        );
        return;
    }

    if (argv[1].length > 50) {
        client.say(event.nick, "Your URL is too long! It must be less than 50 characters.");
        return;
    }

    const user = userQuery({ nick: event.nick.toLowerCase() });
    if (user) {
        await db
            .update(users)
            .set({ ref: argv[1] })
            .where(eq(users.nick, event.nick.toLowerCase()));
        client.say(
            event.nick,
            "Your image has been updated."
        );
    } else {
        client.say(
            event.nick,
            "You need to set a description before you can set your image."
        );
    }
}

const img = {
    name: "img",
    usage: "[url] ",
    description: "Sets your profile image to the specified image.",
    handler: imgHandler,
};

export default img;
