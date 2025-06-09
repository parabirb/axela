import { env } from "node:process";

async function counterHandler(
    client,
    event,
    argv,
    { db, userQuery, users, eq },
) {
    if (argv.length === 1 || argv.length > 3) {
        client.say(
            event.nick,
            `Incorrect usage. See ${env.PREFIX}help counter for more info.`,
        );
    } else if (argv.length === 2) {
        const user = await userQuery.execute({
            nick: event.nick.toLowerCase(),
        });

        if (!user) {
            client.say(
                event.nick,
                "You need a profile to use counter commands on yourself.",
            );
            return;
        }

        switch (argv[1]) {
            case "on":
            case "off": {
                await db
                    .update(users)
                    .set({ counterEnabled: argv[1] === "on" })
                    .where(eq(users.nick, event.nick.toLowerCase()));
                client.say(event.nick, "Your preference has been recorded.");
                break;
            }

            case "reset": {
                await db
                    .update(users)
                    .set({ counter: 0 })
                    .where(eq(users.nick, event.nick.toLowerCase()));
                client.say(event.nick, "Your counter has been reset.");
                break;
            }

            case "show": {
                client.say(
                    event.nick,
                    `Your profile has been viewed ${user.counter} times.`,
                );
                break;
            }

            default: {
                client.say(event.nick, "Unrecognized parameters.");
            }
        }
    } else if (argv.length === 3 && argv[1] === "show") {
        const user = await userQuery.execute({
            nick: argv[2].toLowerCase(),
        });
        if (user) {
            client.say(
                event.nick,
                `${argv[2]} has ${user.counter} profile views.`,
            );
        } else {
            client.say(event.nick, "That user is not registered with me.");
        }
    } else {
        client.say(event.nick, "Unrecognized parameters.");
    }
}

const counter = {
    name: "counter",
    usage: "[on | off | show [user?] | reset] ",
    description:
        "On and off will enable and disable your !who counter. Show will display your !who counter when used with no params--otherwise, it will display the specified user's counter. Reset will reset your counter.",
    handler: counterHandler,
};

export default counter;
