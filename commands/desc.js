import { env } from "node:process";

async function descHandler(client, event, argv, { db, userQuery, users, eq }) {
    if (argv.length === 1) {
        client.say(
            event.nick,
            `Incorrect usage. See ${env.PREFIX}help desc for more info.`
        );
        return;
    }

    if (argv.slice(1).join(" ").length > 200) {
        client.say(
            event.nick,
            "Your description is too long--it may only be up to 200 characters."
        );
        return;
    }

    const user = userQuery({ nick: event.nick.toLowerCase() });
    if (user) {
        await db
            .update(users)
            .set({ desc: argv.slice(1).join(" ") })
            .where(eq(users.nick, event.nick.toLowerCase()));
        client.say(event.nick, "Your description has been updated.");
    } else {
        await db.insert(users).values({
            nick: event.nick.toLowerCase(),
            desc: argv.slice(1).join(" "),
        });
        client.say(event.nick, "Your profile has been created.");
    }
}

const desc = {
    name: "desc",
    usage: "[description] ",
    description: "Sets your description, and creates a profile if you don't have one. Max 200 characters.",
    handler: descHandler,
};

export default desc;
