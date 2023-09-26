import { PrismaClient } from "@prisma/client";
import { test } from "bun:test";

test("prisma_connect", async () => {
  const prisma = new PrismaClient();
  await prisma.$connect();
  await prisma.$disconnect();
});

test("prisma_user", async () => {
  const prisma = new PrismaClient();
  await prisma.user.findMany();
})
