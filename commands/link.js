import { env } from "node:process";

async function linkHandler(client, event, argv, { db, userQuery, users, eq }) {
    if (argv.length !== 2) {
        client.say(
            event.nick,
            `Incorrect usage. See ${env.PREFIX}help link for more info.`
        );
        return;
    }

    if (argv[1].length > 50) {
        client.say(event.nick, "Your URL is too long! It must be less than 50 characters.");
        return;
    }

    const user = await userQuery.execute({ nick: event.nick.toLowerCase() });
    if (user) {
        await db
            .update(users)
            .set({ link: argv[1] })
            .where(eq(users.nick, event.nick.toLowerCase()));
        client.say(
            event.nick,
            "Your link has been updated."
        );
    } else {
        client.say(
            event.nick,
            "You need to set a description before you can set your link."
        );
    }
}

const link = {
    name: "link",
    usage: "[url] ",
    description:
        "Sets your profile link to the specified link.",
    handler: linkHandler,
};

export default link;