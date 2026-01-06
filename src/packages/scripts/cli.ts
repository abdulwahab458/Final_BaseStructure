#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";

const [, , type, ...args] = process.argv;

//
// ================= PATHS =================
//
const ROOT = path.join(process.cwd(), "src");
const PKG = path.join(ROOT, "packages");
const ROLES = path.join(ROOT, "Roles");

//
// ================= HELPERS =================
//
const ok = (msg: string) => {
  console.log(msg);
  process.exit(0);
};

const fail = (msg: string) => {
  console.log("❌ " + msg);
  process.exit(1);
};

const pascal = (s: string) =>
  s.replace(/[-_\s]+/g, " ")
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");

const camel = (s: string) => {
  const p = pascal(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
};

//
// FS HELPERS
//
const ensureFile = (file: string, content = "") => {
  if (fs.existsSync(file)) fail(`Already exists → ${file}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

const ensureFolder = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true });
};

const removePath = (target: string) => {
  if (!fs.existsSync(target)) fail(`Not found → ${target}`);
  fs.rmSync(target, { recursive: true, force: true });
};

//
// export injector (silent)
//
const injectExport = (indexFile: string, line: string) => {
  fs.mkdirSync(path.dirname(indexFile), { recursive: true });

  if (!fs.existsSync(indexFile)) {
    fs.writeFileSync(indexFile, line + "\n");
    return;
  }

  const content = fs.readFileSync(indexFile, "utf8");
  if (!content.includes(line)) fs.appendFileSync(indexFile, line + "\n");
};

//
// usage
//
const usage = () => {
  console.log(`
USAGE

Packages
  aviators component <Name>
  aviators delete-component <Name>

  aviators hook <useName>
  aviators delete-hook <useName>

  aviators util <name>
  aviators delete-util <name>

  aviators store <name>
  aviators delete-store <name>

  aviators context <Name>
  aviators delete-context <Name>

  aviators partial <Name>
  aviators delete-partial <Name>

Roles
  aviators role <role>
  aviators delete-role <role>

Modules
  aviators module <role> <module>
  aviators delete-module <role> <module>
`);
  process.exit(1);
};

if (!type) usage();

//
// ================= NAMING =================
//
const requirePascal = (name: string) => {
  const n = pascal(name);
  if (n[0] !== n[0].toUpperCase()) fail("Must be PascalCase");
  return n;
};

const requireCamel = (name: string) => camel(name);


//
// ===================================================
// ROLES  (base route registry)
// ===================================================
if (type === "role") {
  const role = args[0];
  if (!role) usage();

  const base = path.join(ROLES, role);
  if (fs.existsSync(base)) fail("Role already exists");

  ensureFolder(path.join(base, "assets"));
  ensureFolder(path.join(base, "api"));
  ensureFolder(path.join(base, "modules"));
  ensureFolder(path.join(base, "routes"));

  ensureFile(
    path.join(base, "routes", "route.tsx"),
`// Auto-generated routes for role: ${role}

export const ${role}Routes = [
];
`
  );

  ok(`Role created → ${role}`);
}

if (type === "delete-role") {
  const role = args[0];
  removePath(path.join(ROLES, role));
  ok(`Role deleted → ${role}`);
}



//
// ===================================================
// MODULES (module.tsx + pages + route.ts + registry inject)
// ===================================================
if (type === "module") {
  const [role, mod] = args;
  if (!role || !mod) usage();

  const roleBase = path.join(ROLES, role);
  const modBase  = path.join(roleBase, "modules", mod);

  if (!fs.existsSync(roleBase)) fail("Role does not exist");
  if (fs.existsSync(modBase)) fail("Module already exists");

  const ModuleName = pascal(mod);
  const routeVar   = `${camel(mod)}Route`;

  //
  // create structure
  //
  ensureFolder(modBase);
  ensureFolder(path.join(modBase, "pages"));

  //
  // module.tsx  (main entry)
  //
  ensureFile(
    path.join(modBase, "module.tsx"),
`export default function ${ModuleName}Module() {
  return <div>${ModuleName} Module</div>;
}
`
  );

  //
  // route.ts
  //
  ensureFile(
  path.join(modBase, "route.ts"),
`import React from "react";
import ${ModuleName}Module from "./module";

export const ${routeVar} = {
  path: "/${role}/${mod}",
  element: React.createElement(${ModuleName}Module),
  children: [
    // child page routes will be inserted here
  ]
};
`
);

  //
  // inject into role registry
  //
  const roleRouteFile = path.join(roleBase, "routes", "route.tsx");
  let registry = fs.readFileSync(roleRouteFile, "utf8");

  const importLine =
    `import { ${routeVar} } from "../modules/${mod}/route";`;

  if (!registry.includes(importLine)) {
    registry = importLine + "\n" + registry;
  }

  registry = registry.replace(
    /export const .*Routes = \[/,
    m => m + `\n  ${routeVar},`
  );

  fs.writeFileSync(roleRouteFile, registry);

  ok(`Module created & routed → ${role}/${mod}`);
}



//
// ===================================================
// DELETE MODULE (removes registry + files)
// ===================================================
if (type === "delete-module") {
  const [role, mod] = args;
  if (!role || !mod) usage();

  const modBase = path.join(ROLES, role, "modules", mod);
  const roleRouteFile = path.join(ROLES, role, "routes", "route.tsx");

  const routeVar = `${camel(mod)}Route`;

  removePath(modBase);

  if (fs.existsSync(roleRouteFile)) {
    let content = fs.readFileSync(roleRouteFile, "utf8");

    content = content.replace(new RegExp(`.*${routeVar}.*\\n`, "g"), "");
    content = content.replace(new RegExp(`${routeVar},?\\s*`, "g"), "");

    fs.writeFileSync(roleRouteFile, content);
  }

  ok(`Module deleted & routes cleaned → ${role}/${mod}`);
}
