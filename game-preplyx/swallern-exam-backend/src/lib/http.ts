import { NextResponse, type NextRequest } from "next/server";

function allowedOrigin(request: NextRequest): string {
  const configured = process.env.GAME_ALLOWED_ORIGIN?.trim();
  if (!configured || configured === "*") return "*";
  const requestOrigin = request.headers.get("origin");
  return requestOrigin === configured ? configured : configured;
}

export function apiJson(request: NextRequest, body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Access-Control-Allow-Origin", allowedOrigin(request));
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
  response.headers.set("Vary", "Origin");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function apiOptions(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin(request),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
}
