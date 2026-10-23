"use client";

import { useMemo, useState } from "react";
import { Loader2, Play } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { API_ENDPOINTS, type ApiEndpoint } from "@/lib/api/catalog";

function endpointKey(item: ApiEndpoint) {
  return `${item.method} ${item.path}`;
}

export function ApiExplorer({ origin }: { origin: string }) {
  const [selected, setSelected] = useState(endpointKey(API_ENDPOINTS[5] ?? API_ENDPOINTS[0]));
  const [pathOverride, setPathOverride] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string>("");
  const [status, setStatus] = useState<number | null>(null);

  const current = useMemo(
    () => API_ENDPOINTS.find((item) => endpointKey(item) === selected) ?? API_ENDPOINTS[0],
    [selected],
  );

  const path = pathOverride || current.path.replace(":id", "");

  async function run() {
    setPending(true);
    setResult("");
    setStatus(null);
    try {
      const headers: HeadersInit = { Accept: "application/json", "X-Requested-With": "BT-Hizmet" };
      if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`;
      const init: RequestInit = { method: current.method, headers };
      if (current.method !== "GET") {
        headers["Content-Type"] = "application/json";
        init.body = body.trim() || JSON.stringify(current.body ?? {});
      }
      const response = await fetch(path.startsWith("/") ? path : `/${path}`, init);
      setStatus(response.status);
      const text = await response.text();
      try {
        setResult(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResult(text);
      }
    } catch (error) {
      setResult(error instanceof Error ? error.message : "İstek başarısız.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Canlı deneme</CardTitle>
        <CardDescription>
          Anahtar boşsa mevcut oturumunuz kullanılır; yanıt sizin yetkinize göre süzülür. Dış sistem denemesi için
          bu sayfada üretilen anahtarı yapıştırın (süper yönetici).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_2fr]">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Uç</span>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={selected}
              onChange={(event) => {
                const next = API_ENDPOINTS.find((item) => endpointKey(item) === event.target.value);
                setSelected(event.target.value);
                setPathOverride(next?.path.replace(":id", "") ?? "");
                setBody(next?.body ? JSON.stringify(next.body, null, 2) : "");
              }}
            >
              {API_ENDPOINTS.map((item) => (
                <option key={endpointKey(item)} value={endpointKey(item)}>
                  {item.method} {item.path}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Yol</span>
            <Input value={pathOverride || path} onChange={(event) => setPathOverride(event.target.value)} />
          </label>
        </div>
        <p className="text-muted-foreground text-xs">{current.summary}</p>
        <label className="space-y-1 text-sm">
          <span className="font-medium">API anahtarı (isteğe bağlı)</span>
          <Input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="bth_… boş bırakılırsa oturum kullanılır"
          />
        </label>
        {current.method !== "GET" ? (
          <label className="space-y-1 text-sm">
            <span className="font-medium">JSON gövde</span>
            <Textarea rows={8} value={body} onChange={(event) => setBody(event.target.value)} className="font-mono text-xs" />
          </label>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => void run()} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            İsteği çalıştır
          </Button>
          <span className="text-muted-foreground text-xs">
            {origin}
            {path}
          </span>
          {status !== null ? <span className="text-xs font-medium">HTTP {status}</span> : null}
        </div>
        {result ? (
          <pre className="bg-muted max-h-96 overflow-auto rounded-lg p-3 text-xs leading-relaxed">{result}</pre>
        ) : (
          <Alert>
            <AlertDescription>
              Örnek: GET /api/v1/talepler — servis masası oturumu kendi kuyruğunu, kullanıcı yalnızca kendi
              taleplerini görür.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
