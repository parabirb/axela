import { env } from "node:process";
import { getDesc } from "../greetings.js";

async function whoHandler(client, event, argv, { db, users, eq, userQuery }) {
    if (argv.length !== 2) {
        client.say(
            event.nick,
            `Incorrect usage. See ${env.PREFIX}help who for more info.`
        );
        return;
    }

    const user = await userQuery.execute({ nick: argv[1].toLowerCase() });

    if (user) {
        client.say(event.nick, `${argv[1]} is: ${getDesc(user)}`);
        await db
            .update(users)
            .set({ counter: user.counter + 1 })
            .where(eq(users.nick, argv[1].toLowerCase()));
    } else {
        client.say(event.nick, "That user is not registered with me.");
    }
}

const who = {
    name: "who",
    usage: "[user] ",
    description: "Retrieves the description of the specified user.",
    handler: whoHandler,
};

export default who;
