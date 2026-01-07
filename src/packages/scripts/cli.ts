#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";

const [, , command, ...args] = process.argv;

/* ================= PATHS ================= */

const ROOT = path.join(process.cwd(), "src");
const PACKAGES = path.join(ROOT, "packages");
const ROLES = path.join(ROOT, "Roles");

/* ================= LOGGING ================= */

const ok = (msg: string) => {
  console.log("✅ " + msg);
  process.exit(0);
};

const fail = (msg: string) => {
  console.error("❌ " + msg);
  process.exit(1);
};

/* ================= NAMING ================= */

const pascal = (s: string) =>
  s
    .replace(/[-_\s]+/g, " ")
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");


/* ================= HOOK NAME ENFORCEMENT ================= */

const ensureValidHookName = (name: string) => {
  const pattern = /^use[A-Z][A-Za-z0-9]*$/;

  if (!pattern.test(name)) {
    fail(
      `Invalid hook name "${name}"

Hooks must:
  • start with "use"
  • be camelCase
  • have a capital letter after "use"

Examples:
  useToast
  useUserStore
  useFetchData
`
    );
  }
};

/* ================= UTIL NAME ENFORCEMENT ================= */

const ensureValidUtilName = (name: string) => {
  const pattern = /^[a-z][A-Za-z0-9]*$/;
  const hasUpperAfterFirst = /[A-Z]/.test(name.slice(1));

  if (!pattern.test(name) || !hasUpperAfterFirst) {
    fail(
      `Invalid util name "${name}"

Utils must:
  • be camelCase
  • start with a lowercase letter
  • contain at least one uppercase letter after the first character

Examples:
  calculateTax
  formatDate
  parseJsonValue
`
    );
  }
};



/* ================= FS HELPERS ================= */

const ensureFolder = (dir: string) =>
  fs.mkdirSync(dir, { recursive: true });

const ensureFile = (file: string, content = "") => {
  if (fs.existsSync(file)) fail(`Already exists → ${file}`);
  ensureFolder(path.dirname(file));
  fs.writeFileSync(file, content);
};

const injectAboveExport = (file: string, line: string) => {
  let content = fs.readFileSync(file, "utf8");
  if (content.includes(line)) return;

  const idx = content.indexOf("export default");
  content = content.slice(0, idx) + line + "\n" + content.slice(idx);
  fs.writeFileSync(file, content);
};

const injectRoute = (file: string, route: string) => {
  let content = fs.readFileSync(file, "utf8");
  if (content.includes(route.trim())) return;

  content = content.replace(
    "{/* MODULE_ROUTES */}",
    `${route}\n        {/* MODULE_ROUTES */}`
  );

  fs.writeFileSync(file, content);
};

/* ================= DELETE HELPERS ================= */

const rm = (p: string) => {
  if (!fs.existsSync(p)) fail(`Not found → ${p}`);
  fs.rmSync(p, { recursive: true, force: true });
};

const removeFromFile = (file: string, text: string | RegExp) => {
  let content = fs.readFileSync(file, "utf8");
  const next = content.replace(text as any, "");
  if (next !== content) fs.writeFileSync(file, next);
};

const removeRouteBlock = (file: string, mod: string) => {
  const re = new RegExp(
    `<Route path="${mod}"[\\s\\S]*?<\\/Route>`,
    "g"
  );
  removeFromFile(file, re);
};

const removeImport = (file: string, symbol: string) => {
  const re = new RegExp(
    `import[^;]*?${symbol}[^;]*?;\\s*`,
    "g"
  );
  removeFromFile(file, re);
};


/* ================= USAGE ================= */

const usage = () => {
  console.log(`
USAGE

Packages
  aviators component <Name>
  aviators delete:component <Name>


  aviators hook <useName>
  aviators delete:hook <useName>


  aviators util <name>
  aviators delete:util <name>


  aviators store <name>
  aviators context <Name>
  aviators partial <Name>

Roles
  aviators role <Role>
  aviators delete:role <Role>

Modules
  aviators module <Role> <module>
  aviators delete:module <Role> <module>

Pages
  aviators page <Role> <module> <Page>
  aviators delete:page <Role> <module> <Page>
`);
  process.exit(1);
};

if (!command) usage();

/* ================= PACKAGE COMMANDS ================= */

const pkgCmd = (type: string, name: string, ext = "ts") => {
  const base = path.join(PACKAGES, type);
  if (!fs.existsSync(base)) fail(`Missing packages/${type}`);

  if (type === "components") {
    const dir = path.join(base, name);
    ensureFile(
      path.join(dir, `${name}.tsx`),
      `export function ${name}(){ return <div>${name}</div>; }`
    );
    ensureFile(path.join(dir, "index.ts"), `export * from "./${name}";`);
    fs.appendFileSync(path.join(base, "index.ts"), `export * from "./${name}";\n`);
  } else {
    ensureFile(
      path.join(base, `${name}.${ext}`),
      `export const ${name} = () => {};`
    );
    fs.appendFileSync(path.join(base, "index.ts"), `export * from "./${name}";\n`);
  }

  ok(`${type.slice(0, -1)} created → ${name}`);
};

if (command === "component") pkgCmd("components", pascal(args[0]));
if (command === "hook") {
  const name = args[0];
  ensureValidHookName(name);
  pkgCmd("hooks", name);
}
if (command === "util"){
  const name = args[0];
  ensureValidUtilName(name);
  pkgCmd("utils", name);

}
if (command === "store") pkgCmd("stores", `${args[0]}Store`);
if (command === "context") pkgCmd("context", `${pascal(args[0])}Context`, "tsx");
if (command === "partial") pkgCmd("partials", pascal(args[0]), "tsx");

if (command === "delete:component") {
  const name = pascal(args[0]);
  const dir = path.join(PACKAGES, "components", name);
  rm(dir);
  removeFromFile(path.join(PACKAGES, "components", "index.ts"),
    new RegExp(`export \\* from "./${name}";\\n?`, "g")
  );
  ok(`Component deleted → ${name}`);
}

if (command === "delete:hook") {
  const name = args[0];
  ensureValidHookName(name);
  rm(path.join(PACKAGES, "hooks", `${name}.ts`));
  ok(`Hook deleted → ${name}`);
}

if (command === "delete:util") {
  const name = args[0];
  ensureValidUtilName(name);
  rm(path.join(PACKAGES, "utils", `${name}.ts`));
  ok(`Util deleted → ${name}`);
}

if (command === "delete:store")
  rm(path.join(PACKAGES, "stores", `${args[0]}Store.ts`));

if (command === "delete:context") {
  const name = `${pascal(args[0])}Context`;
  rm(path.join(PACKAGES, "context", `${name}.tsx`));
}

if (command === "delete:partial") {
  const name = pascal(args[0]);
  rm(path.join(PACKAGES, "partials", `${name}.tsx`));
}


/* ================= ROLES ================= */

if (command === "role") {
  const role = args[0];
  const base = path.join(ROLES, role);
  if (fs.existsSync(base)) fail("Role exists");

  ["assets", "api", "modules", "routes"].forEach(d =>
    ensureFolder(path.join(base, d))
  );

  ensureFile(
    path.join(base, "routes", "route.tsx"),
`import { Route } from "react-router-dom";

export default function ${role}Routes() {
  return (
    <Route path="/${role.toLowerCase()}">
        {/* MODULE_ROUTES */}
    </Route>
  );
}
`
  );

  ok(`Role created → ${role}`);
}

if (command === "delete:role") {
  const role = args[0];
  rm(path.join(ROLES, role));
  ok(`Role deleted → ${role}`);
}


/* ================= MODULES ================= */

if (command === "module") {
  const [role, mod] = args;
  const base = path.join(ROLES, role, "modules", mod);
  if (fs.existsSync(base)) fail("Module exists");

  const ModuleName = pascal(mod);

  ensureFolder(path.join(base, "pages"));

  ensureFile(
    path.join(base, `${ModuleName}.tsx`),
`export function ${ModuleName}(){
  return <div>${ModuleName} Module</div>;
}`
  );

  const roleRouteFile = path.join(ROLES, role, "routes", "route.tsx");

  injectAboveExport(
    roleRouteFile,
    `import { ${ModuleName} } from "../modules/${mod}/${mod}";`
  );

  injectRoute(
    roleRouteFile,
`<Route path="${mod}" element={<${ModuleName} />}>
  {/* PAGE_ROUTES_${mod.toUpperCase()} */}
</Route>`
  );

  ok(`Module created → ${role}/${mod}`);
}

if (command === "delete:module") {
  const [role, mod] = args;

  const roleRouteFile = path.join(ROLES, role, "routes", "route.tsx");
  const ModuleName = pascal(mod);

  // remove import & route
  removeImport(roleRouteFile, ModuleName);
  removeRouteBlock(roleRouteFile, mod);

  // delete folder
  rm(path.join(ROLES, role, "modules", mod));

  ok(`Module deleted → ${role}/${mod}`);
}


/* ================= PAGES ================= */

if (command === "page") {
  const [role, mod, page] = args;
  const PageName = pascal(page);

  const moduleBase = path.join(ROLES, role, "modules", mod);
  const roleRouteFile = path.join(ROLES, role, "routes", "route.tsx");

  ensureFile(
    path.join(moduleBase, "pages", `${PageName}.tsx`),
`export function ${PageName}(){
  return <div>${PageName}</div>;
}`
  );

  injectAboveExport(
    roleRouteFile,
    `import { ${PageName} } from "../modules/${mod}/pages/${PageName}";`
  );

  let content = fs.readFileSync(roleRouteFile, "utf8");
  content = content.replace(
    `{/* PAGE_ROUTES_${mod.toUpperCase()} */}`,
    `<Route path="${page.toLowerCase()}" element={<${PageName} />} />\n  {/* PAGE_ROUTES_${mod.toUpperCase()} */}`
  );
  fs.writeFileSync(roleRouteFile, content);

  ok(`Page created → ${role}/${mod}/${PageName}`);
}
if (command === "delete:page") {
  const [role, mod, page] = args;

  const PageName = pascal(page);
  const moduleBase = path.join(ROLES, role, "modules", mod);
  const roleRouteFile = path.join(ROLES, role, "routes", "route.tsx");

  // delete page file
  rm(path.join(moduleBase, "pages", `${PageName}.tsx`));

  // remove import
  removeImport(roleRouteFile, PageName);

  // remove route line
  removeFromFile(
    roleRouteFile,
    new RegExp(
      `<Route path="${page.toLowerCase()}"[^>]*?<\\/${"Route"}>\\s*`,
      "g"
    )
  );

  ok(`Page deleted → ${role}/${mod}/${PageName}`);
}


usage();
