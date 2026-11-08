import { redirect } from "next/navigation";

import { PageHeader } from "@/components/ui-bits";
import { getSession } from "@/lib/auth/session";

import { PasswordForm } from "./password-form";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await getSession();
  if (!user) redirect("/giris");
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title="Parola değiştir"
        description={
          user.mustChangePassword
            ? "Güvenlik gereği ilk girişte parolanızı değiştirmeniz gerekir. Değiştirene kadar başka sayfa açılmaz."
            : "Yerel hesabınızın parolasını değiştirin. Yeni parola güvenlik politikasındaki kurallara uymalıdır."
        }
      />
      <PasswordForm />
    </div>
  );
}
