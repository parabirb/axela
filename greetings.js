import { env } from "node:process";
import { randomBytes } from "node:crypto";

const INTROS = [
    `thumbs through ${env.PRONOUN} files,`,
    `calls ${env.PRONOUN} oracle,`,
    `looks through the phonebook,`,
    `thinks...`,
    `gleams:`,
];

export function getIntro() {
    return INTROS[randomBytes(1)[0] % INTROS.length];
}

export function getDesc(user) {
    // We want the user's refsheet and link as an array if they exist  
    const urlArray = [user.ref, user.link].filter(Boolean);
    return user.desc + (urlArray.length > 0 ? ` ( ${urlArray.join(" | ")} )` : "");
}
