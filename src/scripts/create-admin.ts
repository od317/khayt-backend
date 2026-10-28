import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const prisma = new PrismaClient();

async function readSecret(prompt: string): Promise<string> {
  if (!stdin.isTTY) {
    throw new Error('Run this command from an interactive terminal.');
  }

  stdout.write(prompt);
  stdin.setEncoding('utf8');
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let value = '';

    const cleanup = (): void => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdout.write('\n');
    };

    const onData = (chunk: string): void => {
      for (const character of chunk) {
        if (character === '\u0003') {
          cleanup();
          reject(new Error('Admin creation cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          resolve(value);
          return;
        }
        if (character === '\u007f' || character === '\b') {
          value = Array.from(value).slice(0, -1).join('');
          continue;
        }
        value += character;
      }
    };

    stdin.on('data', onData);
  });
}

async function main(): Promise<void> {
  const terminal = createInterface({ input: stdin, output: stdout });
  let email: string;
  try {
    email = (await terminal.question('Admin email: ')).trim().toLowerCase();
  } finally {
    terminal.close();
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid email address.');
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error(`An account already exists for ${email}; no changes made.`);
  }

  const password = await readSecret('Password (12-72 UTF-8 bytes): ');
  if (
    Buffer.byteLength(password, 'utf8') < 12 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    throw new Error('Password must be between 12 and 72 UTF-8 bytes.');
  }

  const confirmation = await readSecret('Confirm password: ');
  if (password !== confirmation) {
    throw new Error('Passwords do not match.');
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      name: 'Dashboard Admin',
      role: UserRole.admin,
      onboardingCompleted: true,
      verified: true,
    },
  });

  console.log(`Created dashboard admin: ${email}`);
  console.log(
    'The account can sign in after email delivery for 2FA is configured.',
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error
        ? error.message
        : 'Failed to create dashboard admin.',
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
