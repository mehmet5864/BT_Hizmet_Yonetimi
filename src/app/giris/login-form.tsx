"use client";

import { useActionState } from "react";
import { KeyRound, Loader2, LogIn, UserPlus, Users } from "lucide-react";

import { FieldShell } from "@/components/form-fields/field-shell";
import { useT } from "@/components/i18n-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loginAd, loginLocal, registerAd, registerLocal } from "@/lib/actions/auth";
import { EMPTY_STATE } from "@/lib/actions/shared";

const fieldClass =
  "h-10 bg-white text-slate-900 border-slate-300 dark:bg-white dark:text-slate-900 dark:border-slate-300";

function Status({ state }: { state: { ok: boolean; message?: string } }) {
  if (!state.message) return null;
  return (
    <Alert variant={state.ok ? "default" : "destructive"}>
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}

export function LoginForm() {
  const t = useT();
  const [localLogin, localLoginAction, localLoginPending] = useActionState(loginLocal, EMPTY_STATE);
  const [adLogin, adLoginAction, adLoginPending] = useActionState(loginAd, EMPTY_STATE);
  const [localReg, localRegAction, localRegPending] = useActionState(registerLocal, EMPTY_STATE);
  const [adReg, adRegAction, adRegPending] = useActionState(registerAd, EMPTY_STATE);

  return (
    <Tabs defaultValue="local" className="w-full gap-4">
      <TabsList className="grid h-auto w-full grid-cols-2">
        <TabsTrigger value="local" className="h-9 text-slate-700 data-active:text-slate-900">
          <Users className="size-3.5" />
          {t("login.local")}
        </TabsTrigger>
        <TabsTrigger value="ad" className="h-9 text-slate-700 data-active:text-slate-900">
          <KeyRound className="size-3.5" />
          {t("login.ad")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="local">
        <Tabs defaultValue="login" className="gap-4">
          <TabsList className="grid h-auto w-full grid-cols-2" variant="line">
            <TabsTrigger value="login">{t("login.signIn")}</TabsTrigger>
            <TabsTrigger value="register">{t("login.register")}</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="space-y-3 pt-2">
            <Status state={localLogin} />
            <form action={localLoginAction} className="space-y-3">
              <FieldShell id="local-user" label={t("login.username")} tooltip={t("login.usernameHint")}>
                <Input id="local-user" name="username" autoComplete="username" className={fieldClass} />
              </FieldShell>
              <FieldShell id="local-pass" label={t("login.password")} tooltip={t("login.passwordHint")}>
                <Input id="local-pass" name="password" type="password" autoComplete="current-password" className={fieldClass} />
              </FieldShell>
              <Button type="submit" className="h-10 w-full" disabled={localLoginPending}>
                {localLoginPending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                {t("login.submit")}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="register" className="space-y-3 pt-2">
            <Status state={localReg} />
            <form action={localRegAction} className="space-y-3">
              <FieldShell id="reg-name" label={t("login.fullName")} tooltip={t("login.fullNameHint")}>
                <Input id="reg-name" name="fullName" autoComplete="name" className={fieldClass} />
              </FieldShell>
              <FieldShell id="reg-email" label={t("login.email")} tooltip={t("login.emailHint")}>
                <Input id="reg-email" name="email" type="email" autoComplete="email" className={fieldClass} />
              </FieldShell>
              <FieldShell id="reg-user" label={t("login.usernameNew")} tooltip={t("login.usernameNewHint")}>
                <Input id="reg-user" name="username" autoComplete="username" className={fieldClass} />
              </FieldShell>
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldShell id="reg-pass" label={t("login.passwordNew")} tooltip={t("login.passwordNewHint")}>
                  <Input id="reg-pass" name="password" type="password" autoComplete="new-password" className={fieldClass} />
                </FieldShell>
                <FieldShell id="reg-confirm" label={t("login.confirm")} tooltip={t("login.confirmHint")}>
                  <Input id="reg-confirm" name="confirm" type="password" autoComplete="new-password" className={fieldClass} />
                </FieldShell>
              </div>
              <Button type="submit" className="h-10 w-full" disabled={localRegPending}>
                {localRegPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                {t("login.registerSubmit")}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </TabsContent>

      <TabsContent value="ad">
        <Tabs defaultValue="login" className="gap-4">
          <TabsList className="grid h-auto w-full grid-cols-2" variant="line">
            <TabsTrigger value="login">{t("login.signIn")}</TabsTrigger>
            <TabsTrigger value="register">{t("login.register")}</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="space-y-3 pt-2">
            <Status state={adLogin} />
            <form action={adLoginAction} className="space-y-3">
              <FieldShell id="ad-user" label={t("login.adUser")} tooltip={t("login.adUserHint")}>
                <Input id="ad-user" name="username" autoComplete="username" className={fieldClass} />
              </FieldShell>
              <FieldShell id="ad-pass" label={t("login.adPassword")} tooltip={t("login.adPasswordHint")}>
                <Input id="ad-pass" name="password" type="password" autoComplete="current-password" className={fieldClass} />
              </FieldShell>
              <Button type="submit" className="h-10 w-full" disabled={adLoginPending}>
                {adLoginPending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                {t("login.adSubmit")}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="register" className="space-y-3 pt-2">
            <Status state={adReg} />
            <form action={adRegAction} className="space-y-3">
              <FieldShell id="adreg-name" label={t("login.adRegName")} tooltip={t("login.fullNameHint")}>
                <Input id="adreg-name" name="fullName" autoComplete="name" className={fieldClass} />
              </FieldShell>
              <FieldShell id="adreg-user" label={t("login.adRegUser")} tooltip={t("login.adRegUserHint")}>
                <Input id="adreg-user" name="username" autoComplete="username" className={fieldClass} />
              </FieldShell>
              <FieldShell id="adreg-pass" label={t("login.adRegPass")} tooltip={t("login.adRegPassHint")}>
                <Input id="adreg-pass" name="password" type="password" autoComplete="new-password" className={fieldClass} />
              </FieldShell>
              <Button type="submit" className="h-10 w-full" disabled={adRegPending}>
                {adRegPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                {t("login.adRegSubmit")}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}
