from pathlib import Path
import re
from textwrap import dedent


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 exact match, found {count}")
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, replacement: str, label: str) -> str:
    result, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 regex match, found {count}")
    return result


auth_path = Path("src/lib/auth.ts")
auth = auth_path.read_text()
auth = replace_once(
    auth,
    'import { db } from "@/lib/db";\n',
    'import { evaluateAccountCapabilities, type AccountCapabilities } from "@/domains/identity/account-capabilities";\nimport { db } from "@/lib/db";\n',
    "auth import",
)
auth = replace_once(
    auth,
    dedent('''\
    export type CurrentUser = {
      id: string;
      email: string;
      emailVerified: boolean;
      role: string;
    };'''),
    dedent('''\
    export type CurrentUser = {
      id: string;
      email: string;
      emailVerified: boolean;
      role: string;
      accountStatus: string;
    };'''),
    "CurrentUser",
)
auth = replace_once(
    auth,
    dedent('''\
              emailVerified: true,
              role: true,
    '''),
    dedent('''\
              emailVerified: true,
              role: true,
              accountStatus: true,
    '''),
    "session select",
)
auth = replace_once(
    auth,
    dedent('''\
      if (!session?.user) return null;

      return {
        id: session.user.id,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        role: session.user.role || ROLE_USER,
      };'''),
    dedent('''\
      if (!session?.user) return null;
      if (session.user.accountStatus !== "active") return null;

      return {
        id: session.user.id,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        role: session.user.role || ROLE_USER,
        accountStatus: session.user.accountStatus,
      };'''),
    "session result",
)
cookie_block = dedent('''\
export async function getCurrentUserFromCookies() {
  const cookieStore = await cookies();
  return getCurrentUserByToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}
''')
access_block = cookie_block + dedent('''\

type AccountContextUser = Pick<
  CurrentUser,
  "id" | "emailVerified" | "role" | "accountStatus"
>;

export async function getAccountAccessContextForUser(user: AccountContextUser): Promise<{
  restrictions: ActiveRestriction[];
  capabilities: AccountCapabilities;
}> {
  const restrictions = await getActiveRestrictions(user.id);
  const capabilities = evaluateAccountCapabilities({
    accountStatus: user.accountStatus,
    emailVerified: user.emailVerified,
    role: user.role,
    restrictionTypes: restrictions.map((restriction) => restriction.type),
  });
  return { restrictions, capabilities };
}

export async function getAccountCapabilitiesForUser(
  user: AccountContextUser,
): Promise<AccountCapabilities> {
  return (await getAccountAccessContextForUser(user)).capabilities;
}
''')
auth = replace_once(auth, cookie_block, access_block, "account access context")
auth = regex_once(
    auth,
    r'export async function requireDashboardUser\(request: Request\) \{.*?\n\}\n\n// 最严格:',
    dedent('''\
    export async function requireDashboardUser(request: Request) {
      const user = await getCurrentUserFromRequest(request);
      if (!user) {
        return {
          user: null,
          restrictions: null,
          capabilities: null,
          response: NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 }),
        };
      }

      try {
        const { restrictions, capabilities } = await getAccountAccessContextForUser(user);
        if (!capabilities.canEnterDashboard) {
          return {
            user,
            restrictions,
            capabilities,
            response: NextResponse.json(
              { success: false, error: "账号受限，无法进入后台", blockedType: capabilities.blockedBy },
              { status: 403 },
            ),
          };
        }
        return { user, restrictions, capabilities, response: null };
      } catch {
        return {
          user,
          restrictions: null,
          capabilities: null,
          response: NextResponse.json(
            { success: false, error: "限制服务暂时不可用，请稍后重试" },
            { status: 503 },
          ),
        };
      }
    }

    // 最严格:'''),
    "requireDashboardUser",
)
auth = regex_once(
    auth,
    r'export async function requireActiveUser\(request: Request\) \{.*?\n\}\n\n// ====== 密码重置相关 ======',
    dedent('''\
    export async function requireActiveUser(request: Request) {
      const dashboard = await requireDashboardUser(request);
      if (dashboard.response) return dashboard;
      if (!dashboard.capabilities?.canModifySensitiveData) {
        return {
          user: dashboard.user,
          restrictions: dashboard.restrictions,
          capabilities: dashboard.capabilities,
          response: NextResponse.json(
            {
              success: false,
              error: dashboard.capabilities?.blockedBy === "EMAIL_UNVERIFIED"
                ? "请先验证邮箱后再执行此操作"
                : "账号当前无法执行此操作",
              blockedType: dashboard.capabilities?.blockedBy,
            },
            { status: 403 },
          ),
        };
      }
      return dashboard;
    }

    // ====== 密码重置相关 ======'''),
    "requireActiveUser",
)
auth_path.write_text(auth)

login_path = Path("src/app/api/auth/login/route.ts")
login_path.write_text(dedent('''\
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import {
  createSession,
  setSessionCookie,
  isLoginRateLimited,
  recordLoginAttempt,
  getAccountAccessContextForUser,
  RESTRICTION_TYPE_BANNED,
  RESTRICTION_TYPE_SECURITY_RISK,
} from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type LoginRequest = {
  email?: unknown;
  password?: unknown;
};

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, error: "服务暂不可用，请稍后重试。" }, { status: 500 });
  }

  let body: LoginRequest;
  try {
    body = (await request.json()) as LoginRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ success: false, error: "邮箱和密码不能为空。" }, { status: 400 });
  }

  if (await isLoginRateLimited(email, request)) {
    return NextResponse.json({
      success: false,
      error: "登录尝试过于频繁，请 15 分钟后重试，或使用忘记密码功能重置。",
    }, { status: 429 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    await recordLoginAttempt(email, false, request);
    return NextResponse.json({ success: false, error: "邮箱或密码错误。" }, { status: 401 });
  }

  if (user.role === "admin" || user.role === "super_admin") {
    await recordLoginAttempt(email, false, request);
    return NextResponse.json({ success: false, error: "邮箱或密码错误。" }, { status: 401 });
  }

  let access;
  try {
    access = await getAccountAccessContextForUser(user);
  } catch {
    await recordLoginAttempt(email, false, request);
    return NextResponse.json(
      { success: false, error: "限制服务暂时不可用，请稍后重试", errorCode: "RESTRICTION_SERVICE_UNAVAILABLE" },
      { status: 503 },
    );
  }

  const { restrictions, capabilities } = access;
  if (!capabilities.canLogin) {
    await recordLoginAttempt(email, false, request);
    if (capabilities.blockedBy === "ACCOUNT_INACTIVE") {
      return NextResponse.json(
        { success: false, error: "账号已注销", errorCode: "ACCOUNT_DEACTIVATED" },
        { status: 403 },
      );
    }
    if (capabilities.blockedBy === RESTRICTION_TYPE_BANNED) {
      return NextResponse.json(
        { success: false, error: "账号已封禁", errorCode: "ACCOUNT_BANNED" },
        { status: 403 },
      );
    }
    if (capabilities.blockedBy === RESTRICTION_TYPE_SECURITY_RISK) {
      return NextResponse.json(
        { success: false, error: "账号处于安全限制状态", errorCode: "SECURITY_RESTRICTED" },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { success: false, error: "账号受限", errorCode: "ACCOUNT_RESTRICTED" },
      { status: 403 },
    );
  }

  await recordLoginAttempt(email, true, request);
  const { token, expiresAt } = await createSession(user.id, request);
  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      accountStatus: user.accountStatus,
    },
    capabilities,
    restrictions: { items: restrictions, blockedType: null, loginBlocked: false, reason: null },
  });
  setSessionCookie(response, token, expiresAt);
  return response;
}
'''))

dashboard_path = Path("src/app/api/dashboard/route.ts")
dashboard = dashboard_path.read_text()
dashboard = replace_once(
    dashboard,
    dedent('''\
    import {
      requireDashboardUser,
      getActiveRestrictions,
      syncEmailVerificationRestriction,
      canUserLogin,
      RestrictionQueryError,
    } from "@/lib/auth";'''),
    'import { requireDashboardUser } from "@/lib/auth";',
    "dashboard imports",
)
dashboard = regex_once(
    dashboard,
    r'export async function GET\(request: Request\) \{.*?  const data = await getDashboardData\(user.id\);',
    dedent('''\
    export async function GET(request: Request) {
      const { user, response, restrictions, capabilities } = await requireDashboardUser(request);
      if (response || !user) return response;

      const data = await getDashboardData(user.id);'''),
    "dashboard GET prelude",
)
dashboard = regex_once(
    dashboard,
    r'  return NextResponse\.json\(\{\n    success: !restrictionQueryFailed,\n    user,\n    restrictions: restrictionQueryFailed\n      \? \{ queryFailed: true \}\n      : \{ items: restrictions, loginBlocked, loginBlockReason \},',
    dedent('''\
      return NextResponse.json({
        success: true,
        user,
        capabilities,
        restrictions: { items: restrictions ?? [], loginBlocked: false, loginBlockReason: null },'''),
    "dashboard response",
)
dashboard_path.write_text(dashboard)

Path("scripts/refactor/apply-phase1-task2.py").unlink()
Path(".github/workflows/phase1-task2-patcher.yml").unlink()
