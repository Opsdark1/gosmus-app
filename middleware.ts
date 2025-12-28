import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/reset-password", "/verify-email"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.match(/\.(png|jpg|svg|ico|json|txt)$/)) {
    return NextResponse.next();
  }

  const hasSession = Boolean(req.cookies.get("__session")?.value);
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p);

  if (pathname === "/") {
    return NextResponse.redirect(new URL(hasSession ? "/dashboard" : "/login", req.url));
  }

  if (isPublicPath && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (!isPublicPath && !hasSession && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
