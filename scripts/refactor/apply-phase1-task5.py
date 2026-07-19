from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file_path = Path(path)
    text = file_path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 exact match, found {count}")
    file_path.write_text(text.replace(old, new, 1))


replace_once(
    "prisma/schema.prisma",
    '  isPublic                   Boolean          @default(true) @map("is_public")',
    '  isPublic                   Boolean          @default(false) @map("is_public")',
    "Prisma profile default",
)

replace_once(
    "src/app/api/auth/register/route.ts",
    "          isPublic: true,",
    "          isPublic: false,",
    "registration default",
)

replace_once(
    "src/app/api/dashboard/route.ts",
    '''      customTheme: customThemeValue,
      isPublic: true,
    },
    update: {
      displayName,
      bio,
      ...(themeValue ? { theme: themeValue } : {}),
      ...(templateValue ? { template: templateValue } : {}),
      ...(languageValue ? { language: languageValue } : {}),
      ...(customThemeValue ? { customTheme: customThemeValue } : {}),
      isPublic: true,
      ...(newUsername && newUsername !== currentUsername ? { username: newUsername } : {}),''',
    '''      customTheme: customThemeValue,
      isPublic: false,
    },
    update: {
      displayName,
      bio,
      ...(themeValue ? { theme: themeValue } : {}),
      ...(templateValue ? { template: templateValue } : {}),
      ...(languageValue ? { language: languageValue } : {}),
      ...(customThemeValue ? { customTheme: customThemeValue } : {}),
      ...(newUsername && newUsername !== currentUsername ? { username: newUsername } : {}),''',
    "dashboard private save",
)

replace_once(
    "src/app/api/dashboard/profile/route.ts",
    'import { requireActiveUser } from "@/lib/auth";',
    'import { requireDashboardUser } from "@/lib/auth";',
    "profile guard import",
)
replace_once(
    "src/app/api/dashboard/profile/route.ts",
    '''export async function PUT(request: Request) {
  const { user, response } = await requireActiveUser(request);
  if (response || !user) return response;''',
    '''export async function PUT(request: Request) {
  const { user, response, capabilities } = await requireDashboardUser(request);
  if (response || !user) return response;''',
    "profile guard call",
)
replace_once(
    "src/app/api/dashboard/profile/route.ts",
    '''    isPublicValue = body.isPublic;
  }

  let contactVisibilityValue: string | undefined;''',
    '''    isPublicValue = body.isPublic;
    if (isPublicValue && !capabilities?.canPublishProfile) {
      return NextResponse.json(
        {
          success: false,
          error: "邮箱验证完成前，主页保持未发布；你仍可继续编辑资料。",
          errorCode: "PROFILE_PUBLISH_NOT_ALLOWED",
        },
        { status: 403 },
      );
    }
  }

  let contactVisibilityValue: string | undefined;''',
    "profile publish capability",
)
replace_once(
    "src/app/api/dashboard/profile/route.ts",
    "      isPublic: isPublicValue ?? true,",
    "      isPublic: isPublicValue ?? false,",
    "profile upsert default",
)

replace_once(
    "src/components/dashboard-v1/types.ts",
    '''export type DashboardUser = {
  id?: string;
  email: string;
  emailVerified: boolean;
  role?: string;
};

export type DashboardProfile = {''',
    '''export type DashboardUser = {
  id?: string;
  email: string;
  emailVerified: boolean;
  role?: string;
};

export type DashboardCapabilities = {
  canLogin: boolean;
  canEnterDashboard: boolean;
  canModifySensitiveData: boolean;
  canPublishProfile: boolean;
  canExposePublicResources: boolean;
  canEnterJeepwork: boolean;
  blockedBy: string | null;
};

export type DashboardProfile = {''',
    "dashboard capability type",
)
replace_once(
    "src/components/dashboard-v1/types.ts",
    '''  user?: DashboardUser;
  profile?: DashboardProfile | null;''',
    '''  user?: DashboardUser;
  capabilities?: DashboardCapabilities;
  profile?: DashboardProfile | null;''',
    "dashboard response capability",
)

replace_once(
    "src/components/dashboard-v1/core-store.ts",
    'import type { DashboardLink, DashboardProfile, DashboardUser, SaveState } from "@/components/dashboard-v1/types";',
    'import type { DashboardCapabilities, DashboardLink, DashboardProfile, DashboardUser, SaveState } from "@/components/dashboard-v1/types";',
    "core capability import",
)
replace_once(
    "src/components/dashboard-v1/core-store.ts",
    '''const emptyUser: DashboardUser = { email: "", emailVerified: false };

type PlanEntitlements = {''',
    '''const emptyUser: DashboardUser = { email: "", emailVerified: false };
const emptyCapabilities: DashboardCapabilities = {
  canLogin: false,
  canEnterDashboard: false,
  canModifySensitiveData: false,
  canPublishProfile: false,
  canExposePublicResources: false,
  canEnterJeepwork: false,
  blockedBy: "UNKNOWN",
};

type PlanEntitlements = {''',
    "core capability default",
)
replace_once(
    "src/components/dashboard-v1/core-store.ts",
    '''  const [user, setUser] = useState<DashboardUser>(emptyUser);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);''',
    '''  const [user, setUser] = useState<DashboardUser>(emptyUser);
  const [capabilities, setCapabilities] = useState<DashboardCapabilities>(emptyCapabilities);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);''',
    "core capability state",
)
replace_once(
    "src/components/dashboard-v1/core-store.ts",
    '''      setUser({ id: result.user?.id, email: result.user?.email || "", emailVerified: Boolean(result.user?.emailVerified), role: result.user?.role });
      setProfile(nextProfile);''',
    '''      setUser({ id: result.user?.id, email: result.user?.email || "", emailVerified: Boolean(result.user?.emailVerified), role: result.user?.role });
      setCapabilities(result.capabilities || emptyCapabilities);
      setProfile(nextProfile);''',
    "core capability load",
)
replace_once(
    "src/components/dashboard-v1/core-store.ts",
    '''  const saveProfileSettings = useCallback(async (settings: { isPublic?: boolean; language?: string; contactVisibility?: string }) => {
    setAppearanceSaving(true);''',
    '''  const saveProfileSettings = useCallback(async (settings: { isPublic?: boolean; language?: string; contactVisibility?: string }) => {
    if (settings.isPublic === true && !capabilities.canPublishProfile) {
      showToast("邮箱验证完成前，主页保持未发布；你仍可继续编辑资料。", "error");
      return false;
    }
    setAppearanceSaving(true);''',
    "core publish precheck",
)
replace_once(
    "src/components/dashboard-v1/core-store.ts",
    '''  }, [showToast]);

  const refreshEntitlements = useCallback(async () => {''',
    '''  }, [capabilities.canPublishProfile, showToast]);

  const refreshEntitlements = useCallback(async () => {''',
    "core publish dependencies",
)
replace_once(
    "src/components/dashboard-v1/core-store.ts",
    '''    loading, loadError, user, profile, planCode, planEntitlements,
    username, displayName, bio, saveState, uploadingAvatar, appearanceSaving, deactivating,''',
    '''    loading, loadError, user, capabilities, profile, planCode, planEntitlements,
    username, displayName, bio, saveState, uploadingAvatar, appearanceSaving, deactivating,''',
    "core capability return",
)

replace_once(
    "src/components/dashboard-v1/DashboardV1Client.tsx",
    '''else if (activeTab === "appearance") panel = <AppearancePanel theme={core.profile?.theme || "草木原色"} template={core.profile?.template || "business"} customThemes={core.planEntitlements.customThemes} customTheme={core.profile?.custom_theme || null} isPublic={core.profile?.is_public ?? true} language={core.profile?.language || "zh"} contactVisibility={core.profile?.contact_visibility || "public"} saving={core.appearanceSaving} onSave={core.saveAppearance} onSaveCustom={core.saveCustomTheme} onSaveSystem={core.saveProfileSettings} onUpgrade={onUpgrade} />;''',
    '''else if (activeTab === "appearance") panel = <AppearancePanel theme={core.profile?.theme || "草木原色"} template={core.profile?.template || "business"} customThemes={core.planEntitlements.customThemes} customTheme={core.profile?.custom_theme || null} isPublic={core.profile?.is_public ?? false} canPublishProfile={core.capabilities.canPublishProfile} publishBlockedMessage="邮箱验证完成前，主页保持未发布；你仍可继续编辑资料。" language={core.profile?.language || "zh"} contactVisibility={core.profile?.contact_visibility || "public"} saving={core.appearanceSaving} onSave={core.saveAppearance} onSaveCustom={core.saveCustomTheme} onSaveSystem={core.saveProfileSettings} onUpgrade={onUpgrade} />;''',
    "client appearance capability",
)
replace_once(
    "src/components/dashboard-v1/DashboardV1Client.tsx",
    "您的邮箱尚未验证，请在 30 天内完成验证，否则主页将暂停公开展示。",
    "邮箱验证完成前，主页保持未发布；你仍可继续编辑资料。",
    "client verification copy",
)

replace_once(
    "src/components/dashboard-v1/AppearancePanel.tsx",
    '''  isPublic: boolean;
  language: string;''',
    '''  isPublic: boolean;
  canPublishProfile: boolean;
  publishBlockedMessage: string;
  language: string;''',
    "appearance capability props",
)
replace_once(
    "src/components/dashboard-v1/AppearancePanel.tsx",
    '''  isPublic,
  language,''',
    '''  isPublic,
  canPublishProfile,
  publishBlockedMessage,
  language,''',
    "appearance capability destructure",
)
replace_once(
    "src/components/dashboard-v1/AppearancePanel.tsx",
    '''                <input type="checkbox" checked={systemDraft.isPublic} onChange={(event) => setSystemDraft((prev) => ({ ...prev, isPublic: event.target.checked }))} className="size-5 accent-[var(--ui-brand)]" />''',
    '''                <input
                  type="checkbox"
                  checked={systemDraft.isPublic}
                  disabled={!canPublishProfile && !systemDraft.isPublic}
                  onChange={(event) => {
                    const nextIsPublic = event.target.checked;
                    if (nextIsPublic && !canPublishProfile) return;
                    setSystemDraft((prev) => ({ ...prev, isPublic: nextIsPublic }));
                  }}
                  className="size-5 accent-[var(--ui-brand)] disabled:cursor-not-allowed disabled:opacity-50"
                />''',
    "appearance publish toggle",
)
replace_once(
    "src/components/dashboard-v1/AppearancePanel.tsx",
    '''                   <p className="text-xs ui-muted">{systemDraft.isPublic ? "任何人都可以访问你的主页" : "只有你自己可以查看"}</p>
                 </div>''',
    '''                   <p className="text-xs ui-muted">{systemDraft.isPublic ? "任何人都可以访问你的主页" : "只有你自己可以查看"}</p>
                   {!canPublishProfile && !systemDraft.isPublic ? <p className="mt-1 text-xs text-[var(--ui-danger)]">{publishBlockedMessage}</p> : null}
                 </div>''',
    "appearance blocked message",
)

migration = Path("prisma/migrations/20260719090000_profile_private_by_default/migration.sql")
if migration.exists():
    raise SystemExit("private profile migration already exists")
migration.parent.mkdir(parents=True, exist_ok=True)
migration.write_text('ALTER TABLE "profiles" ALTER COLUMN "is_public" SET DEFAULT false;\n')
