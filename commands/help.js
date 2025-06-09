import { env } from "node:process";

function helpHandler(client, event, argv, { commands }) {
    if (argv.length === 1) {
        client.say(
            event.nick,
            `Hi! I'm ${env.NICK}, a greeting bot. To add a description for your nickname to my database, use the ${env.PREFIX}desc command. To find info on a particular command, do ${env.PREFIX}help [command]. The following commands are available: ${commands.map((command) => env.PREFIX + command.name).join(" ")}`
        );
    }
    else {
        const command = commands.find(command => command.name === argv[1]);
        if (command) {
            client.say(
                event.nick,
                `${env.PREFIX}${command.name} ${command.usage}-- ${command.description}`
            );
        }
        else {
            client.say(
                event.nick,
                "I can't find that command!"
            );
        }
    }
}

const help = {
    name: "help",
    usage: "[command?] ",
    description:
        "Displays the generic help message when invoked without an argument. Displays the help message for the specified command otherwise.",
    handler: helpHandler,
};

export default help;
