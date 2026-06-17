// ============================================
// DASHBOARD SERVICE TESTS (pure mapping functions)
// ============================================

import { describe, it } from "node:test";
import assert from "node:assert";
import {
	mapBalances,
	mapTrades,
	mapEquityHistory,
	buildBotStatus,
	computeTotalDeposited,
} from "../dashboardService";
import type {
	BinanceAccountResponse,
	BinanceTradeResponse,
	BinanceSnapshotResponse,
	BinanceDeposit,
	BinanceTransfer,
} from "../../types/binance";

describe("dashboardService — pure functions", () => {
	describe("mapBalances", () => {
		it("should filter out zero-balance assets", () => {
			const account: BinanceAccountResponse = {
				makerCommission: 10,
				takerCommission: 10,
				buyerCommission: 0,
				sellerCommission: 0,
				canTrade: true,
				canWithdraw: true,
				canDeposit: true,
				updateTime: 1700000000000,
				accountType: "SPOT",
				balances: [
					{ asset: "BTC", free: "1.5", locked: "0.0" },
					{ asset: "FDUSD", free: "50000.0", locked: "100.0" },
					{ asset: "ETH", free: "0.0", locked: "0.0" },
					{ asset: "BNB", free: "0.0", locked: "0.0" },
				],
				permissions: ["SPOT"],
			};

			const result = mapBalances(account);

			assert.strictEqual(
				result.length,
				2,
				"should only include non-zero assets",
			);
			assert.strictEqual(result[0].asset, "BTC");
			assert.strictEqual(result[0].free, "1.5");
			assert.strictEqual(result[0].locked, "0.0");
			assert.strictEqual(result[1].asset, "FDUSD");
		});

		it("should include assets with only locked balance", () => {
			const account: BinanceAccountResponse = {
				makerCommission: 0,
				takerCommission: 0,
				buyerCommission: 0,
				sellerCommission: 0,
				canTrade: true,
				canWithdraw: false,
				canDeposit: false,
				updateTime: 0,
				accountType: "SPOT",
				balances: [{ asset: "BTC", free: "0.0", locked: "0.5" }],
				permissions: [],
			};

			const result = mapBalances(account);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].asset, "BTC");
			assert.strictEqual(result[0].locked, "0.5");
		});

		it("should return empty array when all balances are zero", () => {
			const account: BinanceAccountResponse = {
				makerCommission: 0,
				takerCommission: 0,
				buyerCommission: 0,
				sellerCommission: 0,
				canTrade: true,
				canWithdraw: false,
				canDeposit: false,
				updateTime: 0,
				accountType: "SPOT",
				balances: [{ asset: "BTC", free: "0.0", locked: "0.0" }],
				permissions: [],
			};

			const result = mapBalances(account);

			assert.strictEqual(result.length, 0);
		});
	});

	describe("mapTrades", () => {
		it("should map Binance trade fields to dashboard trade", () => {
			const trades: BinanceTradeResponse[] = [
				{
					id: 12345,
					symbol: "BTCFDUSD",
					orderId: 100,
					orderListId: -1,
					price: "50000.00",
					qty: "0.01",
					quoteQty: "500.00",
					commission: "0.50",
					commissionAsset: "FDUSD",
					time: 1700000000000,
					isBuyer: true,
					isMaker: false,
					isBestMatch: true,
				},
				{
					id: 12346,
					symbol: "BTCFDUSD",
					orderId: 101,
					orderListId: -1,
					price: "51000.00",
					qty: "0.02",
					quoteQty: "1020.00",
					commission: "1.02",
					commissionAsset: "FDUSD",
					time: 1700000100000,
					isBuyer: false,
					isMaker: true,
					isBestMatch: true,
				},
			];

			const result = mapTrades(trades);

			assert.strictEqual(result.length, 2);
			assert.strictEqual(result[0].id, 12345);
			assert.strictEqual(result[0].symbol, "BTCFDUSD");
			assert.strictEqual(result[0].price, "50000.00");
			assert.strictEqual(result[0].isBuyer, true);
			assert.strictEqual(result[0].isMaker, false);
			// Should NOT include isBestMatch
			assert.strictEqual((result[0] as any).isBestMatch, undefined);

			assert.strictEqual(result[1].isBuyer, false);
			assert.strictEqual(result[1].isMaker, true);
		});

		it("should return empty array when trades list is empty", () => {
			const result = mapTrades([]);
			assert.strictEqual(result.length, 0);
		});
	});

	describe("mapEquityHistory", () => {
		it("should map snapshotVos to equity points sorted by time ascending", () => {
			const snapshot: BinanceSnapshotResponse = {
				code: 200,
				msg: "",
				snapshotVos: [
					{
						updateTime: 1700000000000, // Dec 14, 2023 (approx)
						data: {
							balances: [
								{
									asset: "BTC",
									totalAsset: "1.5",
									freeAsset: "1.5",
									lockedAsset: "0.0",
								},
							],
							totalAssetOfBtc: "1.8",
						},
					},
					{
						updateTime: 1698000000000, // Oct 22, 2023 (approx) — older
						data: {
							balances: [
								{
									asset: "BTC",
									totalAsset: "1.0",
									freeAsset: "1.0",
									lockedAsset: "0.0",
								},
							],
							totalAssetOfBtc: "1.5",
						},
					},
				],
			};

			const result = mapEquityHistory(snapshot);

			assert.strictEqual(result.length, 2);
			// Should be sorted by time ascending (older first)
			assert.ok(
				result[0].date.includes("Oct"),
				`expected Oct but got ${result[0].date}`,
			);
			assert.strictEqual(result[0].value, 1.5);
			assert.ok(
				result[1].date.includes("Dec") || result[1].date.includes("Nov"),
				`expected later month but got ${result[1].date}`,
			);
			assert.strictEqual(result[1].value, 1.8);
		});

		it("should filter out snapshots without totalAssetOfBtc", () => {
			const snapshot: BinanceSnapshotResponse = {
				code: 200,
				msg: "",
				snapshotVos: [
					{
						updateTime: 1700000000000,
						data: {
							balances: [],
							totalAssetOfBtc: "1.0",
						},
					},
					{
						updateTime: 1690000000000,
						data: {
							balances: [],
							totalAssetOfBtc: "", // empty string should be filtered
						},
					},
				],
			};

			const result = mapEquityHistory(snapshot);

			assert.strictEqual(
				result.length,
				1,
				"should filter empty totalAssetOfBtc",
			);
			assert.strictEqual(result[0].value, 1.0);
		});

		it("should return empty array when snapshotVos is empty", () => {
			const snapshot: BinanceSnapshotResponse = {
				code: 200,
				msg: "",
				snapshotVos: [],
			};

			const result = mapEquityHistory(snapshot);

			assert.strictEqual(result.length, 0);
		});
	});

	describe("buildBotStatus", () => {
		it("should return active=true when keys exist", () => {
			const status = buildBotStatus(true);
			assert.strictEqual(status.active, true);
			assert.strictEqual(status.runningSince, null);
			assert.strictEqual(status.strategy, "Conservative Spot Trading");
		});

		it("should return active=false when no keys", () => {
			const status = buildBotStatus(false);
			assert.strictEqual(status.active, false);
			assert.strictEqual(status.runningSince, null);
			assert.strictEqual(status.strategy, "Conservative Spot Trading");
		});
	});

	describe("computeTotalDeposited — per-coin cumulative aggregation", () => {
		const deposit = (
			coin: string,
			amount: string,
			insertTime: number,
			status: number = 1,
		): BinanceDeposit => ({
			amount,
			coin,
			network: "BSC",
			status,
			address: "addr",
			addressTag: "",
			txId: `tx-${insertTime}`,
			insertTime,
			confirmTimes: "1/1",
		});

		const transfer = (
			asset: string,
			amount: string,
			timestamp: number,
		): BinanceTransfer => ({
			asset,
			amount,
			type: "MAIN_UMFUTURE",
			status: "CONFIRMED",
			tranId: timestamp,
			timestamp,
		});

		it("returns empty object when both deposits and transfers are empty", () => {
			const result = computeTotalDeposited([], []);
			assert.deepStrictEqual(result, {});
		});

		it("returns empty object when deposits undefined and transfers empty", () => {
			const result = computeTotalDeposited([], undefined);
			assert.deepStrictEqual(result, {});
		});

		it("aggregates multiple FDUSD deposits into a single coin key", () => {
			const deposits: BinanceDeposit[] = [
				deposit("FDUSD", "1.00", 1_700_000_000_000),
				deposit("FDUSD", "9.14", 1_710_000_000_000),
			];
			const result = computeTotalDeposited(deposits, []);
			assert.deepStrictEqual(result, { FDUSD: 10.14 });
		});

		it("aggregates deposits and transfers across multiple coins", () => {
			const deposits: BinanceDeposit[] = [
				deposit("FDUSD", "5.00", 1_700_000_000_000),
				deposit("BTC", "0.5", 1_700_000_001_000),
			];
			const transfers: BinanceTransfer[] = [
				transfer("USDT", "100.00", 1_700_000_002_000),
			];
			const result = computeTotalDeposited(deposits, transfers);
			assert.deepStrictEqual(result, { FDUSD: 5, BTC: 0.5, USDT: 100 });
		});

		it("includes both status=1 and status=6 deposits", () => {
			const deposits: BinanceDeposit[] = [
				deposit("FDUSD", "5.00", 1_700_000_000_000, 1),
				deposit("FDUSD", "5.14", 1_710_000_000_000, 6),
			];
			const result = computeTotalDeposited(deposits, []);
			assert.deepStrictEqual(result, { FDUSD: 10.14 });
		});

		it("excludes pending deposits (status=0)", () => {
			const deposits: BinanceDeposit[] = [
				deposit("FDUSD", "5.00", 1_700_000_000_000, 1),
				deposit("FDUSD", "10.00", 1_700_000_001_000, 0),
			];
			const result = computeTotalDeposited(deposits, []);
			assert.deepStrictEqual(result, { FDUSD: 5 });
		});

		it("ignores deposits with non-numeric amounts", () => {
			const deposits: BinanceDeposit[] = [
				deposit("FDUSD", "5.00", 1_700_000_000_000),
				deposit("BTC", "not-a-number", 1_700_000_001_000),
			];
			const result = computeTotalDeposited(deposits, []);
			assert.deepStrictEqual(result, { FDUSD: 5 });
		});

		it("returns the full per-coin map including non-stablecoins (BTC, ETH)", () => {
			// The map is a faithful record of all deposits; the dashboard's
			// "seed capital" total filters to STABLECOINS at the orchestrator
			// level, not here. This test documents the contract.
			const deposits: BinanceDeposit[] = [
				deposit("FDUSD", "100.00", 1_700_000_000_000),
				deposit("USDT", "50.00", 1_700_000_001_000),
				deposit("USDC", "25.00", 1_700_000_002_000),
				deposit("BTC", "0.001", 1_700_000_003_000),
			];
			const result = computeTotalDeposited(deposits, []);
			assert.deepStrictEqual(result, {
				FDUSD: 100,
				USDT: 50,
				USDC: 25,
				BTC: 0.001,
			});
		});
	});
});
