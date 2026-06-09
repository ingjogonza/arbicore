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
} from "../dashboardService";
import type {
	BinanceAccountResponse,
	BinanceTradeResponse,
	BinanceSnapshotResponse,
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
});
