import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Keep native import in both builds so Node 20 can load ESM-only dependencies.
const importModule = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;

export async function resolveOptionalModule(name: string): Promise<string> {
  const { moduleResolve } = await importModule("import-meta-resolve");
  const resolveFrom = (parent: URL): string => {
    try {
      return moduleResolve(name, parent).href;
    } catch {
      return pathToFileURL(createRequire(parent).resolve(name)).href;
    }
  };
  try {
    return resolveFrom(pathToFileURL(path.join(process.cwd(), "__ombra_resolve__.mjs")));
  } catch {
    return resolveFrom(pathToFileURL(__filename));
  }
}

export async function loadOptionalModule(name: string): Promise<any> {
  return importModule(await resolveOptionalModule(name));
}

export async function optionalModuleAvailable(name: string): Promise<boolean> {
  try {
    await resolveOptionalModule(name);
    return true;
  } catch {
    return false;
  }
}
