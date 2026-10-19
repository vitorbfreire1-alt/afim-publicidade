// Cria (ou atualiza a senha d)o primeiro usuário dono. Uso: npm run seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const email = (process.env.SEED_EMAIL ?? "").trim().toLowerCase();
const senha = process.env.SEED_SENHA ?? "";
if (!email || senha.length < 8) {
  console.error("Defina SEED_EMAIL e SEED_SENHA (mín. 8 caracteres) no .env");
  process.exit(1);
}

await prisma.usuario.upsert({
  where: { email },
  update: { senhaHash: await bcrypt.hash(senha, 10), papel: "DONO", ativo: true },
  create: { email, nome: process.env.SEED_NOME || "Dono", senhaHash: await bcrypt.hash(senha, 10), papel: "DONO" },
});
console.log(`Dono pronto: ${email}`);
await prisma.$disconnect();
