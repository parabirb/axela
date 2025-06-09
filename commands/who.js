import { env } from "node:process";
import { getDesc } from "../greetings.js";

async function whoHandler(client, event, argv, { userQuery }) {
    if (argv.length !== 2) {
        client.say(
            event.nick,
            `Incorrect usage. See ${env.PREFIX}help who for more info.`
        );
        return;
    }

    const user = await userQuery({ nick: argv[1].toLowerCase() });

    if (user) {
        client.say(event.nick, `${argv[1]} is: ${getDesc(user)}`);
    } else {
        client.say("That user is not registered with me.");
    }
}

const who = {
    name: "who",
    usage: "[user] ",
    description: "Retrieves the description of the specified user.",
    handler: whoHandler,
};

export default who;
