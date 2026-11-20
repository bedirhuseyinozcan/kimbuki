const test = require('node:test');
const assert = require('node:assert/strict');
const RewardService = require('../game/services/RewardService');
const Room = require('../game/Room');
const GameManager = require('../game/GameManager');

function createMockIo() {
    const emitted = [];
    const io = {
        emitted,
        to: (target) => ({
            emit: (event, payload) => emitted.push({ target, event, payload })
        })
    };
    return io;
}

test('RewardService.calculatePotDistribution never mints gold above totalPot', () => {
    // 2 players, pot 200000, 1 bettor on winner
    const res2p = RewardService.calculatePotDistribution({
        isBettingEnabled: true,
        totalPot: 200000,
        playersCount: 2,
        rank: 1,
        bettorCount: 1
    });
    assert.equal(res2p.winnerReward, 150000);
    assert.equal(res2p.bettorReward, 50000);
    assert.ok(res2p.winnerReward + res2p.bettorReward <= 200000);

    // 2 players, pot 200000, 0 bettors -> winner gets 100%
    const resNoBet = RewardService.calculatePotDistribution({
        isBettingEnabled: true,
        totalPot: 200000,
        playersCount: 2,
        rank: 1,
        bettorCount: 0
    });
    assert.equal(resNoBet.winnerReward, 200000);
    assert.equal(resNoBet.bettorReward, 0);

    // 5 players, pot 5000, sum across all ranks with multiple bettors <= 5000
    let totalPaid = 0;
    for (let rank = 1; rank <= 5; rank++) {
        const bettorCount = 3;
        const r = RewardService.calculatePotDistribution({
            isBettingEnabled: true,
            totalPot: 5000,
            playersCount: 5,
            rank,
            bettorCount
        });
        totalPaid += r.winnerReward + r.bettorReward * bettorCount;
    }
    assert.ok(totalPaid <= 5000, `Total paid ${totalPaid} exceeded pot 5000`);

    // Rank 5 in 5p game has 0% share -> must NOT mint 1 phantom gold
    const rank5 = RewardService.calculatePotDistribution({
        isBettingEnabled: true,
        totalPot: 5000,
        playersCount: 5,
        rank: 5,
        bettorCount: 2
    });
    assert.equal(rank5.winnerReward, 0);
    assert.equal(rank5.bettorReward, 0);
});

test('Room.addUser prevents seat/dbId hijacking by name-only join', () => {
    const io = createMockIo();
    const room = new Room('TEST01', io);

    room.addUser('sock-victim', 'Bedir', 'db-user-1', 'Wizard', 'gold_pedestal', 500, 'color_gold', 'title_rich');
    room.users[0].disconnected = true;

    // Attacker tries to join with same name but no dbId (or different dbId)
    room.addUser('sock-attacker', 'Bedir', null, 'Warrior', 'default_stone', 0, 'text-white', '');
    assert.equal(room.users.length, 2, 'Attacker must not hijack authenticated seat');
    assert.equal(room.users[0].id, 'sock-victim');
    assert.equal(room.users[0].dbId, 'db-user-1');
    assert.equal(room.users[0].isHost, true);
    assert.equal(room.users[1].isHost, false);
    assert.equal(room.users[1].dbId, null);

    // Real victim reconnects with matching dbId -> reclaims seat
    room.addUser('sock-victim-2', 'Bedir', 'db-user-1', 'Wizard', 'gold_pedestal', 500, 'color_gold', 'title_rich');
    assert.equal(room.users.length, 2);
    assert.equal(room.users[0].id, 'sock-victim-2');
    assert.equal(room.users[0].disconnected, false);
    assert.equal(room.users[0].isHost, true);
});

test('GameManager.sanitizeCosmetics strips unowned shop items', () => {
    const gm = new GameManager(createMockIo());
    const profile = {
        reputation: 100,
        unlockedAvatars: ['Warrior'],
        unlockedPedestals: ['default_stone'],
        unlockedNameColors: ['text-white'],
        unlockedTitles: []
    };

    const res = gm.sanitizeCosmetics(profile, 'Cleric', 'cloud_base', 'color_gold', 'title_rich');
    assert.deepEqual(res, {
        safeAvatar: 'Warrior',
        safePedestal: 'default_stone',
        safeNameColor: 'text-white',
        safeTitle: ''
    });

    const ownedProfile = {
        reputation: 100,
        unlockedAvatars: ['Warrior', 'Cleric'],
        unlockedPedestals: ['default_stone', 'cloud_base'],
        unlockedNameColors: ['text-white', 'color_gold'],
        unlockedTitles: ['title_rich']
    };
    const resOwned = gm.sanitizeCosmetics(ownedProfile, 'Cleric', 'cloud_base', 'color_gold', 'title_rich');
    assert.deepEqual(resOwned, {
        safeAvatar: 'Cleric',
        safePedestal: 'cloud_base',
        safeNameColor: 'color_gold',
        safeTitle: 'title_rich'
    });
});
