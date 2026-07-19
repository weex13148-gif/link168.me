from pathlib import Path

script_path = Path("scripts/refactor/apply-phase1-task5.py")
text = script_path.read_text()
marker = '    "appearance blocked message",\n)'
label_index = text.find(marker)
if label_index < 0:
    raise SystemExit("appearance blocked-message marker not found")
start = text.rfind("\nreplace_once(\n", 0, label_index)
if start < 0:
    raise SystemExit("appearance blocked-message replace block not found")
start += 1
end = label_index + len(marker)
lines = [
    "replace_once(",
    '    "src/components/dashboard-v1/AppearancePanel.tsx",',
    "    '''<p className=\"text-xs ui-muted\">{systemDraft.isPublic ? \"任何人都可以访问你的主页\" : \"只有你自己可以查看\"}</p>",
    "                </div>''',",
    "    '''<p className=\"text-xs ui-muted\">{systemDraft.isPublic ? \"任何人都可以访问你的主页\" : \"只有你自己可以查看\"}</p>",
    "                  {!canPublishProfile && !systemDraft.isPublic ? <p className=\"mt-1 text-xs text-[var(--ui-danger)]\">{publishBlockedMessage}</p> : null}",
    "                </div>''',",
    '    "appearance blocked message",',
    ")",
]
replacement = "\n".join(lines)
script_path.write_text(text[:start] + replacement + text[end:])
