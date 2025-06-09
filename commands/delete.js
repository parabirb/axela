import { env } from "node:process";

async function deleteHandler(
    client,
    event,
    argv,
    { db, users, userQuery, eq }
) {
    if (argv.length !== 2) {
        client.say(
            event.nick,
            `Incorrect usage. See ${env.PREFIX}help delete for more info.`
        );
        return;
    }

    const user = userQuery({ nick: event.nick.toLowerCase() });

    if (user)
        switch (argv[1]) {
            case "image": {
                if (!user.ref) {
                    client.say(event.nick, "You don't have an image set!");
                    return;
                }

                await db
                    .update(users)
                    .set({ ref: null })
                    .where(eq(users.nick, event.nick.toLowerCase()));
                client.say(event.nick, "Your image has been deleted.");
                break;
            }

            case "link": {
                if (!user.link) {
                    client.say(event.nick, "You don't have a link set!");
                    return;
                }

                await db
                    .update(users)
                    .set({ link: null })
                    .where(eq(users.nick, event.nick.toLowerCase()));
                client.say(event.nick, "Your link has been deleted.");
                break;
            }

            case "all": {
                await db
                    .delete(users)
                    .where(eq(users.nick, event.nick.toLowerCase()));
                client.say(event.nick, "Your profile has been deleted.");
                break;
            }

            default: {
                client.say(event.nick, "Unrecognized parameters.");
            }
        }
    else {
        client.say(event.nick, "You don't have a profile registered with me!");
    }
}

const deleteCommand = {
    name: "delete",
    usage: "[image | link | all] ",
    description: "Removes one or all of your elements from your profile.",
    handler: deleteHandler,
};

export default deleteCommand;
