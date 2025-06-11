// Helper for detecting channel OP status
import { env } from "node:process";

export function isOP(modes) {
    for (const mode of modes) {
        if (env.ADMIN_MODES.includes(mode)) return true;
    }

    return false;
}
