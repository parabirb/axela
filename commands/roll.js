import { env } from "node:process";
import { randomBytes } from "node:crypto";

async function rollHandler(client, event, argv, { colors }) {
    if (argv.length !== 2) {
        client.say(
            event.nick,
            `Incorrect usage. See ${env.PREFIX}help roll for more info.`
        );
        return;
    }

    const target = event.target.startsWith("#") ? event.target : event.nick;

    if (/^\dd\d{1,2}$/.test(argv[1])) {
        const parameters = argv[1].split("d").map(Number);
        if (parameters[0] === 0) {
            client.say(target, "You're gonna have to roll at least 1 die.");
            return;
        }

        const dice = [...randomBytes(parameters[0])].map(
            (number) => (number % parameters[1]) + 1
        );
        if (dice.length === 1) {
            client.action(target, `rolls the die... it's a ${colors.red(dice[0])}!`);
        } else {
            client.action(
                target,
                `rolls the dice... they add up to ${colors.red(dice.reduce((previous, current) => previous + current, 0))}! ${colors.gray(`(${dice.join(", ")})`)}`
            );
        }
    } else {
        client.say(target, "That doesn't seem valid to me...");
    }
}

const roll = {
    name: "roll",
    usage: "[number of dice]d[number of sides] ",
    description: "Rolls dice as specified. Supports up to 9 dice and 99 sides.",
    handler: rollHandler,
};

export default roll;
