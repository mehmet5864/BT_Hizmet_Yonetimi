import { Box } from "lucide-react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/giris/login-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ensureLocalPasswords } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/app-version";
import { getSession } from "@/lib/auth/session";
import { getTranslator } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await ensureLocalPasswords();
  if (await getSession()) redirect("/");
  const { t } = await getTranslator();

  return (
    <div className="login-canvas relative flex min-h-svh items-center justify-center p-4">
      <div className="absolute top-4 end-4 z-10">
        <LanguageSwitcher />
      </div>
      <div className="login-card w-full max-w-md rounded-2xl p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#276dd9] text-white">
            <Box className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{t("appName")}</p>
            <p className="text-xs text-slate-500">{t("login.subtitle", { version: APP_VERSION })}</p>
          </div>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-slate-500">
          <a href="/docs/kullanici-kilavuzu.pdf" className="underline underline-offset-2 hover:text-slate-800">
            {t("login.userGuide")}
          </a>
          <span className="px-2">·</span>
          <a href="/docs/yonetici-kilavuzu.pdf" className="underline underline-offset-2 hover:text-slate-800">
            {t("login.adminGuide")}
          </a>
          <span className="px-2">·</span>
          <a href="/indir" className="underline underline-offset-2 hover:text-slate-800">
            {t("login.downloadPackage", { version: APP_VERSION })}
          </a>
        </p>
      </div>
    </div>
  );
}
