import { env } from "node:process";

async function migrateHandler(client, event, argv, { userQuery }) {
    const user = await userQuery.execute({ nick: event.nick });
    if (user) {
        console.log(user);
        client.say(
            event.nick,
            "I cannot migrate your profile from Alexa if you already have a description set."
        );
    } else {
        client.action(
            event.nick,
            `is working on migrating your description. Please wait.`
        );
        client.say("Alexa", `!who ${event.nick}`);
    }
}

const migrate = env.MIGRATION
    ? {
          name: "migrate",
          usage: "",
          description: "Migrates your description from Alexa.",
          handler: migrateHandler,
      }
    : null;

export default migrate;
