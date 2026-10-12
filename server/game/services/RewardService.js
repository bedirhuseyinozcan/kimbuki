const User = require('../../models/User');

class RewardService {
    /**
     * Atomically updates user gold and reputation, and progresses active quests.
     * @param {string} dbId MongoDB user ID
     * @param {Object} rewards { gold, rep, winCount, playCount, betWinCount }
     */
    static async grantUserRewards(dbId, { gold = 0, rep = 0, winCount = 0, playCount = 0, betWinCount = 0 } = {}) {
        if (!dbId) return null;

        try {
            const incPayload = {};
            if (gold !== 0) incPayload.gold = gold;
            if (rep !== 0) incPayload.reputation = rep;

            const updateQuery = Object.keys(incPayload).length > 0 ? { $inc: incPayload } : {};
            const userDb = await User.findOneAndUpdate(
                { _id: dbId },
                updateQuery,
                { new: true }
            );

            if (userDb && userDb.quests && userDb.quests.active) {
                let modified = false;
                userDb.quests.active.forEach(q => {
                    if (q.type === 'win' && !q.isClaimed && q.progress < q.target && winCount > 0) {
                        q.progress += winCount;
                        modified = true;
                    }
                    if (q.type === 'play' && !q.isClaimed && q.progress < q.target && playCount > 0) {
                        q.progress += playCount;
                        modified = true;
                    }
                    if (q.type === 'bet_win' && !q.isClaimed && q.progress < q.target && betWinCount > 0) {
                        q.progress += betWinCount;
                        modified = true;
                    }
                });

                if (modified) {
                    userDb.markModified('quests');
                    await userDb.save();
                }
            }

            return userDb;
        } catch (error) {
            console.error(`[RewardService] Error granting rewards to user ${dbId}:`, error);
            return null;
        }
    }

    /**
     * Grants rewards in batch to multiple users concurrently.
     * @param {Object} playerRewards Map of dbId -> { gold, rep, winCount, playCount, betWinCount }
     */
    static async grantBatchRewards(playerRewards) {
        if (!playerRewards || typeof playerRewards !== 'object') return [];
        const entries = Object.entries(playerRewards);
        const promises = entries.map(([dbId, rewards]) => this.grantUserRewards(dbId, rewards));
        return Promise.all(promises);
    }

    /**
     * Grants participation rewards to non-winning players at the end of a round.
     * @param {Array} users List of room users
     * @param {Array} winnerIds List of winning socket IDs
     * @param {number} participationRep Default: 5
     */
    static async grantParticipationRewards(users, winnerIds = [], participationRep = 5) {
        if (!Array.isArray(users)) return [];

        const promises = users
            .filter(u => u.dbId && !winnerIds.includes(u.id))
            .map(u => {
                u.reputation = (u.reputation || 0) + participationRep;
                return this.grantUserRewards(u.dbId, { rep: participationRep, playCount: 1 });
            });

        return Promise.all(promises);
    }

    /**
     * Atomically deducts entry bet amount from all active players.
     * If any player has insufficient gold or fails, rolls back all deducted players.
     * @param {Array} activeUsers List of active user objects
     * @param {number} betAmount Entry bet amount
     * @returns {Object} { ok: boolean, failedUser: Object | null }
     */
    static async deductBetFees(activeUsers, betAmount) {
        if (!betAmount || betAmount <= 0) return { ok: true, failedUser: null };
        const deductedUserDbIds = [];

        for (let u of activeUsers) {
            if (u.dbId) {
                try {
                    const updated = await User.findOneAndUpdate(
                        { _id: u.dbId, gold: { $gte: betAmount } },
                        { $inc: { gold: -betAmount } },
                        { new: true }
                    );
                    if (!updated) {
                        await this.refundBetFees(deductedUserDbIds, betAmount);
                        return { ok: false, failedUser: u };
                    }
                    deductedUserDbIds.push(u.dbId);
                } catch (err) {
                    console.error(`[RewardService] Error deducting bet fee for ${u.name}:`, err);
                    await this.refundBetFees(deductedUserDbIds, betAmount);
                    return { ok: false, failedUser: u };
                }
            } else {
                await this.refundBetFees(deductedUserDbIds, betAmount);
                return { ok: false, failedUser: u };
            }
        }
        return { ok: true, failedUser: null };
    }

    /**
     * Refunds deducted bet fees in case of rollback or cancelled game.
     * @param {Array} dbIds List of user dbIds
     * @param {number} betAmount
     */
    static async refundBetFees(dbIds, betAmount) {
        if (!Array.isArray(dbIds) || dbIds.length === 0 || !betAmount) return;
        const promises = dbIds.map(id =>
            User.findByIdAndUpdate(id, { $inc: { gold: betAmount } }).catch(e => console.error(e))
        );
        await Promise.all(promises);
    }
    /**
     * Atomically progresses a specific quest type for a user.
     * @param {string} dbId
     * @param {string} questType
     * @param {number} amount
     */
    static async progressQuest(dbId, questType, amount = 1) {
        if (!dbId || !questType) return null;
        try {
            const userDb = await User.findById(dbId);
            if (userDb && userDb.quests && userDb.quests.active) {
                let modified = false;
                userDb.quests.active.forEach(q => {
                    if (q.type === questType && !q.isClaimed && q.progress < q.target) {
                        q.progress += amount;
                        modified = true;
                    }
                });
                if (modified) {
                    userDb.markModified('quests');
                    await userDb.save();
                }
            }
            return userDb;
        } catch (err) {
            console.error(`[RewardService] Error progressing quest ${questType} for user ${dbId}:`, err);
            return null;
        }
    }

    /**
     * Fetches user reputation with lean/select query.
     * @param {string} userId
     * @returns {number}
     */
    static async getUserReputation(userId) {
        if (!userId) return 0;
        try {
            const user = await User.findById(userId).select('reputation').lean();
            return user?.reputation || 0;
        } catch {
            return 0;
        }
    }

    /**
     * Calculates winner gold, bettor gold, and reputation rewards based on player count, rank, and game mode.
     * @param {Object} params
     * @param {boolean} params.isBettingEnabled
     * @param {number} params.totalPot
     * @param {number} params.playersCount
     * @param {number} params.rank
     * @param {boolean} params.isRussianRoulette
     * @returns {Object} { winnerReward, bettorReward, repReward }
     */
    static calculatePotDistribution({ isBettingEnabled = false, totalPot = 0, playersCount = 2, rank = 1, isRussianRoulette = false }) {
        let winnerReward = 0;
        let bettorReward = 0;

        if (isBettingEnabled) {
            if (isRussianRoulette) {
                winnerReward = totalPot;
                bettorReward = 0;
            } else {
                let pct = 0;
                if (playersCount <= 2) {
                    pct = rank === 1 ? 1.0 : 0;
                } else if (playersCount === 3) {
                    pct = rank === 1 ? 0.60 : (rank === 2 ? 0.40 : 0);
                } else if (playersCount === 4) {
                    pct = rank === 1 ? 0.50 : (rank === 2 ? 0.30 : (rank === 3 ? 0.20 : 0));
                } else {
                    if (rank === 1) pct = 0.40;
                    else if (rank === 2) pct = 0.30;
                    else if (rank === 3) pct = 0.20;
                    else if (rank === 4) pct = 0.10;
                    else pct = 0;
                }
                winnerReward = Math.floor(totalPot * pct);
                bettorReward = Math.max(1, Math.floor(winnerReward / 2));
            }
        }

        let repReward = 5;
        if (isRussianRoulette) repReward = 200;
        else if (rank === 1) repReward = 50;
        else if (rank === 2) repReward = 20;
        else if (rank === 3) repReward = 10;

        return {
            winnerReward,
            bettorReward,
            repReward
        };
    }
}

module.exports = RewardService;
