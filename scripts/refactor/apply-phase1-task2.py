from pathlib import Path
import subprocess
import sys

REVIEWED_PATCH_COMMIT = "6503c0a24a2c414eb6ebe6d492924318e0042f0d"


def replace_named_block(source: str, label: str, replacement: str) -> str:
    label_marker = f'    "{label}",'
    label_index = source.index(label_marker)
    start = source.rfind("auth = replace_once(\n", 0, label_index)
    if start < 0:
        raise SystemExit(f"{label}: opening block not found")
    end = source.index("\n)", label_index) + 2
    return source[:start] + replacement + source[end:]


subprocess.run(
    ["git", "fetch", "--depth=20", "origin", "agent/refactor-phase1-task2-auth-capabilities"],
    check=True,
)
previous = subprocess.check_output(
    ["git", "show", f"{REVIEWED_PATCH_COMMIT}:scripts/refactor/apply-phase1-task2.py"],
    text=True,
)

previous = replace_named_block(
    previous,
    "session select",
    '''auth = replace_once(
    auth,
    "          emailVerified: true,\\n          role: true,\\n",
    "          emailVerified: true,\\n          role: true,\\n          accountStatus: true,\\n",
    "session select",
)''',
)

previous = replace_named_block(
    previous,
    "session result",
    '''auth = replace_once(
    auth,
    "  if (!session?.user) return null;\\n\\n  return {\\n    id: session.user.id,\\n    email: session.user.email,\\n    emailVerified: session.user.emailVerified,\\n    role: session.user.role || ROLE_USER,\\n  };",
    "  if (!session?.user) return null;\\n  if (session.user.accountStatus !== \\\"active\\\") return null;\\n\\n  return {\\n    id: session.user.id,\\n    email: session.user.email,\\n    emailVerified: session.user.emailVerified,\\n    role: session.user.role || ROLE_USER,\\n    accountStatus: session.user.accountStatus,\\n  };",
    "session result",
)''',
)

temporary = Path("/tmp/apply-phase1-task2-corrected.py")
temporary.write_text(previous)
subprocess.run([sys.executable, str(temporary)], check=True)
