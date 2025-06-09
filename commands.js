import fs from "node:fs/promises";
import path from "node:path";

const commands = [];

for (const file of await fs.readdir(
    path.join(import.meta.dirname, "commands")
)) {
    const command = await import(`./commands/${file}`) // eslint-disable-line no-await-in-loop
    if (command.default !== null) commands.push(command.default);
    // We ignore the no-await-in-loop warning because it makes literally no difference in this context
}

export default commands;