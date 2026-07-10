import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAiCreditBalance,
  consumeAiCredits,
  refundAiCredits,
  createAiCreditOperationId,
  listAiCreditLedger,
} from '../credits';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    aiCreditAccount: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findUnique: vi.fn(),
    },
    aiCreditLedger: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockDb = db as unknown as {
  aiCreditAccount: {
    upsert: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  aiCreditLedger: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe('AI Credits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAiCreditOperationId', () => {
    it('should generate a valid UUID', () => {
      const id = createAiCreditOperationId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('getAiCreditBalance', () => {
    it('should return balance and version', async () => {
      mockDb.aiCreditAccount.upsert.mockResolvedValue({
        id: 'acc-1',
        balance: 100,
        version: 5,
      });

      const result = await getAiCreditBalance('user-1');

      expect(result).toEqual({ accountId: 'acc-1', balance: 100, version: 5 });
      expect(mockDb.aiCreditAccount.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1', balance: 0 },
        update: {},
        select: { id: true, balance: true, version: true },
      });
    });
  });

  describe('consumeAiCredits', () => {
    it('should reject invalid amount', async () => {
      const result = await consumeAiCredits({
        userId: 'user-1',
        amount: 0,
        idempotencyKey: 'key-1',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('扣减数量不正确');
    });

    it('should deduct credits successfully', async () => {
      mockDb.$transaction.mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
        return fn(mockDb);
      });
      mockDb.aiCreditLedger.findUnique.mockResolvedValue(null);
      mockDb.aiCreditAccount.upsert.mockResolvedValue({
        id: 'acc-1',
        balance: 10,
        version: 1,
      });
      mockDb.aiCreditAccount.updateMany.mockResolvedValue({ count: 1 });
      mockDb.aiCreditAccount.findUniqueOrThrow.mockResolvedValue({ balance: 9 });
      mockDb.aiCreditLedger.create.mockResolvedValue({ id: 'ledger-1' });

      const result = await consumeAiCredits({
        userId: 'user-1',
        amount: 1,
        idempotencyKey: 'key-1',
      });

      expect(result.success).toBe(true);
      expect(result.balance).toBe(9);
      expect(result.ledgerId).toBe('ledger-1');
      expect(mockDb.aiCreditAccount.updateMany).toHaveBeenCalledWith({
        where: { id: 'acc-1', balance: { gte: 1 }, version: 1 },
        data: { balance: { decrement: 1 }, version: { increment: 1 } },
      });
    });

    it('should fail when balance is insufficient', async () => {
      mockDb.$transaction.mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
        return fn(mockDb);
      });
      mockDb.aiCreditLedger.findUnique.mockResolvedValue(null);
      mockDb.aiCreditAccount.upsert.mockResolvedValue({
        id: 'acc-1',
        balance: 0,
        version: 1,
      });
      mockDb.aiCreditAccount.updateMany.mockResolvedValue({ count: 0 });

      const result = await consumeAiCredits({
        userId: 'user-1',
        amount: 1,
        idempotencyKey: 'key-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('不足');
    });

    it('should detect version mismatch (concurrent conflict)', async () => {
      mockDb.$transaction.mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
        return fn(mockDb);
      });
      mockDb.aiCreditLedger.findUnique.mockResolvedValue(null);
      mockDb.aiCreditAccount.upsert.mockResolvedValue({
        id: 'acc-1',
        balance: 10,
        version: 1,
      });
      // Simulate concurrent update: version changed, so updateMany returns 0
      mockDb.aiCreditAccount.updateMany.mockResolvedValue({ count: 0 });

      const result = await consumeAiCredits({
        userId: 'user-1',
        amount: 1,
        idempotencyKey: 'key-1',
      });

      expect(result.success).toBe(false);
      expect(mockDb.aiCreditAccount.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ version: 1 }),
        })
      );
    });

    it('should be idempotent for same idempotencyKey', async () => {
      mockDb.$transaction.mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
        return fn(mockDb);
      });
      mockDb.aiCreditLedger.findUnique.mockResolvedValue({
        id: 'ledger-1',
        balanceAfter: 5,
        entryType: 'consume',
      });

      const result = await consumeAiCredits({
        userId: 'user-1',
        amount: 1,
        idempotencyKey: 'dup-key',
      });

      expect(result.success).toBe(true);
      expect(result.balance).toBe(5);
      expect(result.alreadyApplied).toBe(true);
      expect(mockDb.aiCreditAccount.updateMany).not.toHaveBeenCalled();
    });

    it('should detect idempotency key mismatch', async () => {
      mockDb.$transaction.mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
        return fn(mockDb);
      });
      mockDb.aiCreditLedger.findUnique.mockResolvedValue({
        id: 'ledger-1',
        balanceAfter: 5,
        entryType: 'refund',
      });

      const result = await consumeAiCredits({
        userId: 'user-1',
        amount: 1,
        idempotencyKey: 'dup-key',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('幂等键冲突');
    });

    it('should retry on transaction error and eventually fail', async () => {
      mockDb.$transaction.mockRejectedValue(new Error('DB connection lost'));

      const result = await consumeAiCredits({
        userId: 'user-1',
        amount: 1,
        idempotencyKey: 'key-err',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('请稍后重试');
      expect(mockDb.$transaction).toHaveBeenCalledTimes(3);
    });
  });

  describe('refundAiCredits', () => {
    it('should refund credits successfully', async () => {
      mockDb.$transaction.mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
        return fn(mockDb);
      });
      mockDb.aiCreditLedger.findUnique.mockResolvedValue(null);
      mockDb.aiCreditAccount.upsert.mockResolvedValue({
        id: 'acc-1',
        version: 2,
      });
      mockDb.aiCreditAccount.update.mockResolvedValue({ balance: 11 });
      mockDb.aiCreditLedger.create.mockResolvedValue({ id: 'ledger-2' });

      const result = await refundAiCredits({
        userId: 'user-1',
        amount: 1,
        idempotencyKey: 'refund-key-1',
        reason: '测试退款',
      });

      expect(result.success).toBe(true);
      expect(result.balance).toBe(11);
      expect(result.ledgerId).toBe('ledger-2');
      expect(mockDb.aiCreditAccount.update).toHaveBeenCalledWith({
        where: { id: 'acc-1', version: 2 },
        data: { balance: { increment: 1 }, version: { increment: 1 } },
        select: { balance: true },
      });
    });

    it('should retry on version conflict and eventually fail', async () => {
      mockDb.$transaction.mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
        return fn(mockDb);
      });
      mockDb.aiCreditLedger.findUnique.mockResolvedValue(null);
      mockDb.aiCreditAccount.upsert.mockResolvedValue({
        id: 'acc-1',
        version: 2,
      });
      // Simulate concurrent update causing version mismatch
      const prismaError = Object.assign(new Error('Record to update not found'), { code: 'P2025' });
      mockDb.aiCreditAccount.update.mockRejectedValue(prismaError);

      const result = await refundAiCredits({
        userId: 'user-1',
        amount: 1,
        idempotencyKey: 'refund-conflict',
        reason: '测试退款冲突',
      });

      expect(result.success).toBe(false);
      expect(mockDb.$transaction).toHaveBeenCalledTimes(3);
    });

    it('should reject invalid amount', async () => {
      const result = await refundAiCredits({
        userId: 'user-1',
        amount: -1,
        idempotencyKey: 'key-1',
        reason: '测试',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('退回数量不正确');
    });
  });

  describe('listAiCreditLedger', () => {
    it('should return ledger entries', async () => {
      mockDb.aiCreditAccount.findUnique.mockResolvedValue({
        id: 'acc-1',
        balance: 50,
        ledger: [
          {
            id: 'l1',
            entryType: 'consume',
            amount: -1,
            balanceAfter: 50,
            referenceType: 'ai_chat',
            referenceId: null,
            reason: 'AI 对话消费',
            metadata: null,
            createdAt: new Date('2024-01-01'),
          },
        ],
      });

      const result = await listAiCreditLedger('user-1', 10);

      expect(result.balance).toBe(50);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].id).toBe('l1');
    });

    it('should return empty ledger when user has no account', async () => {
      mockDb.aiCreditAccount.findUnique.mockResolvedValue(null);

      const result = await listAiCreditLedger('user-new');

      expect(result.balance).toBe(0);
      expect(result.entries).toEqual([]);
    });
  });
});
