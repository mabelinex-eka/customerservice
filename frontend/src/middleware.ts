import { NextResponse, type NextRequest } from "next/server";

// Password-protects the whole app with HTTP Basic auth (any username, password = APP_PASSWORD).
// The SOP is internal, so the app refuses to serve anything until APP_PASSWORD is set.
export function middleware(req: NextRequest) {
  const pass = process.env.APP_PASSWORD;
  if (!pass) {
    return new NextResponse("CS Answer Desk is locked: set the APP_PASSWORD environment variable.", { status: 503 });
  }
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const given = decoded.slice(decoded.indexOf(":") + 1);
      if (given.length === pass.length && given === pass) return NextResponse.next();
    } catch { /* fall through */ }
  }
  return new NextResponse("Sign in to the CS Answer Desk.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="uParcel CS Answer Desk", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
