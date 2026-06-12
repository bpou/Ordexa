import bcrypt from "bcrypt";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

function parseArgs(argv) {
  const parsed = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;

    const key = arg.slice(2);
    const next = argv[i + 1];

    if (key === "reset-mfa") {
      parsed.resetMfa = true;
      continue;
    }

    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    parsed[key] = next;
    i += 1;
  }

  return parsed;
}

function toBool(value) {
  if (typeof value !== "string") return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function usage() {
  console.error(
    [
      "Usage:",
      "  node scripts/create-admin.mjs --email <email> --password <password> [--name <name>] [--role ADMIN] [--reset-mfa]",
      "",
      "Environment variable alternatives:",
      "  CREATE_ADMIN_EMAIL",
      "  CREATE_ADMIN_PASSWORD",
      "  CREATE_ADMIN_NAME",
      "  CREATE_ADMIN_ROLE",
      "  CREATE_ADMIN_RESET_MFA=true",
    ].join("\n")
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const emailInput = args.email ?? process.env.CREATE_ADMIN_EMAIL;
  const password = args.password ?? process.env.CREATE_ADMIN_PASSWORD;
  const nameInput = args.name ?? process.env.CREATE_ADMIN_NAME;
  const roleInput = args.role ?? process.env.CREATE_ADMIN_ROLE ?? "ADMIN";
  const resetMfa = args.resetMfa || toBool(process.env.CREATE_ADMIN_RESET_MFA);

  if (!emailInput || !password) {
    usage();
    throw new Error("Both email and password are required.");
  }

  const email = emailInput.trim().toLowerCase();
  const name = (nameInput?.trim() || email.split("@")[0] || "Admin").slice(0, 191);

  if (!Object.prototype.hasOwnProperty.call(Role, roleInput)) {
    throw new Error(`Invalid role "${roleInput}". Expected one of: ${Object.keys(Role).join(", ")}`);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const role = Role[roleInput];

  const data = {
    email,
    name,
    role,
    passwordHash,
    ...(resetMfa
      ? {
          totpEnabled: false,
          totpEnabledAt: null,
          totpSecret: null,
          totpTempSecret: null,
        }
      : {}),
  };

  const user = await prisma.user.upsert({
    where: { email },
    update: data,
    create: data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      totpEnabled: true,
      emailVerified: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        user,
        resetMfa,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
