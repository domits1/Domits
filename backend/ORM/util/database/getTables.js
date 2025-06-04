import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import * as fs from "fs";

export async function getTables() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const ormRoot = path.resolve(__dirname, "../../");
    const entitiesPath = path.join(ormRoot, "models");

    const entityFiles = fs.readdirSync(entitiesPath).filter(f => f.endsWith(".js"));
    const entities = entityFiles.map(f => {
        const filePath = path.join(entitiesPath, f);
        const fileUrl = pathToFileURL(filePath).href;
        return import(fileUrl);
    });

    const resolvedEntities = await Promise.all(entities);
    return resolvedEntities.map(module => Object.values(module)[0]);
}
