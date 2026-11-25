
import settings from "../config/settings.json";

export type Settings = {
    [k in keyof typeof settings]: typeof settings[k];
}

export default settings;
