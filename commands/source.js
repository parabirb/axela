import { env } from "node:process";

async function sourceHandler(client, event) {
    client.say(event.nick, `My source code can be found at ${env.SOURCE}.`);
}

const source = env.SOURCE ? {
    name: "source",
    usage: " ",
    description:
        "Sends you a link to the source code for the bot.",
    handler: sourceHandler,
} : null;

export default source;