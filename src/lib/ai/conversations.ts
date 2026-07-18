import { db } from "@/lib/db";
import crypto from "crypto";
import type { AiAssistantTitle } from "@/lib/ai/assistants";

export type AssistantType = AiAssistantTitle;

export async function ensureProfileForUser(userId: string) {
  let profile = await db.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    profile = await db.profile.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        username: `user_${userId.slice(0, 8)}`,
        isPublic: false,
      },
      select: { id: true },
    });
  }

  return profile.id;
}

export async function createConversation(
  userId: string,
  assistant: AssistantType,
  title?: string,
) {
  const profileId = await ensureProfileForUser(userId);

  const conversation = await db.aiConversation.create({
    data: {
      id: crypto.randomUUID(),
      profileId,
      status: "active",
      transferredToHuman: false,
    },
  });

  return conversation;
}

export async function listConversations(
  userId: string,
  assistant?: AssistantType,
  limit = 20,
) {
  const profile = await db.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) return [];

  const conversations = await db.aiConversation.findMany({
    where: {
      profileId: profile.id,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          role: true,
          createdAt: true,
        },
      },
    },
  });

  return conversations.map((c) => ({
    id: c.id,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    status: c.status,
    profileId: c.profileId,
    visitorSessionId: c.visitorSessionId,
    transferredToHuman: c.transferredToHuman,
    messages: c.messages.map((m) => ({
      id: m.id,
      role: m.role,
      createdAt: m.createdAt.toISOString(),
      content: m.content,
    })),
  }));
}

export async function getConversation(
  userId: string,
  conversationId: string,
) {
  const profile = await db.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) return null;

  const conversation = await db.aiConversation.findFirst({
    where: {
      id: conversationId,
      profileId: profile.id,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          creditCost: true,
          sourceRefs: true,
          createdAt: true,
        },
      },
    },
  });

  return conversation;
}

export async function addMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  creditCost = 0,
  sourceRefs?: unknown,
) {
  const message = await db.aiMessage.create({
    data: {
      id: crypto.randomUUID(),
      conversationId,
      role,
      content,
      creditCost,
      sourceRefs: sourceRefs as any,
    },
  });

  await db.aiConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
}

export async function deleteConversation(
  userId: string,
  conversationId: string,
) {
  const profile = await db.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) return false;

  const result = await db.aiConversation.deleteMany({
    where: {
      id: conversationId,
      profileId: profile.id,
    },
  });

  return result.count > 0;
}
