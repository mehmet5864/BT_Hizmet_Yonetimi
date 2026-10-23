import { dispatchApi } from "@/lib/api/dispatch";
import { runWithApiRequest } from "@/lib/api/guard";
import { apiError, apiOptions } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request, context: { params: Promise<{ path?: string[] }> }, method: string) {
  return runWithApiRequest(request, async () => {
    try {
      const { path = [] } = await context.params;
      const origin = new URL(request.url).origin;
      return await dispatchApi(request, method, path, origin);
    } catch {
      return apiError("Sunucu hatası.", 500);
    }
  });
}

export function OPTIONS(request: Request) {
  return runWithApiRequest(request, () => apiOptions());
}

export function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context, "GET");
}

export function POST(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context, "POST");
}

export function PATCH(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context, "PATCH");
}
