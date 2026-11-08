"use server";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getSession, setSessionCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getSecurityPolicy, passwordPolicyError } from "@/lib/security/policy";
import { saved, type ActionState } from "./shared";

/** Oturumdaki kullanıcının kendi (yerel) parolasını değiştirir. İlk giriş zorunluluğunu da kaldırır. */
export async function changeOwnPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getSession();
  if (!user) return { ok: false, message: "Oturum gerekli." };

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!current || !next) return { ok: false, message: "Mevcut ve yeni parola zorunludur." };
  if (next !== confirm) return { ok: false, message: "Yeni parolalar eşleşmiyor." };
  if (next === current) return { ok: false, message: "Yeni parola mevcut parolayla aynı olamaz." };

  const person = await prisma.person.findUnique({
    where: { id: user.id },
    select: { passwordHash: true, roleSource: true },
  });
  if (!person) return { ok: false, message: "Hesap bulunamadı." };
  if (person.roleSource === "AD") {
    return { ok: false, message: "Bu hesap Active Directory ile doğrulanır; parolayı AD üzerinden değiştirin." };
  }
  if (!verifyPassword(current, person.passwordHash)) {
    return { ok: false, message: "Mevcut parola hatalı." };
  }
  const policy = await passwordPolicyError(next);
  if (policy) return { ok: false, message: policy };

  await prisma.person.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(next), mustChangePassword: false, failedLogins: 0, lockedUntil: null },
  });
  const security = await getSecurityPolicy();
  await setSessionCookie({ ...user, mustChangePassword: false }, security.sessionHours);
  return saved("/", "Parola değiştirildi.");
}
