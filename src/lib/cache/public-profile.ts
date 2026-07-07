"use server";

import { revalidatePath } from "next/cache";

export async function revalidatePublicProfile(username: string): Promise<void> {
  revalidatePath(`/${username}`);
}

export async function revalidatePublicProfileByUser(userId: string): Promise<void> {
  const { db } = await import("@/lib/db");
  const profile = await db.profile.findUnique({
    where: { userId },
    select: { username: true },
  });
  if (profile) {
    revalidatePath(`/${profile.username}`);
  }
}

export async function revalidateUsernameChange(oldUsername: string, newUsername: string): Promise<void> {
  revalidatePath(`/${oldUsername}`);
  revalidatePath(`/${newUsername}`);
}