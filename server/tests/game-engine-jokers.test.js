const test = require('node:test');
const assert = require('node:assert/strict');
const Room = require('../game/Room');
const JokerManager = require('../game/jokers');
const objectionHandler = require('../game/handlers/objectionHandler');
const guessHandler = require('../game/handlers/guessHandler');

function createMockIo() {
    const emitted = [];
    return {
        emitted,
        to: (target) => ({
            emit: (event, payload) => emitted.push({ target, event, payload })
        })
    };
}

function setupPlayingRoom(playerCount = 3) {
    const io = createMockIo();
    const room = new Room('ENG01', io);
    for (let i = 0; i < playerCount; i++) {
        room.addUser(`s${i + 1}`, `Player${i + 1}`, null);
        room.users[i].assignedWord = `Kelime${i + 1}`;
    }
    room.gameState = 'PLAYING';
    room.roundCount = 3;
    room.currentTurnIndex = 0;
    room.turnStartTime = Date.now();
    return { room, io };
}

test('permanentlyRemoveUser preserves currentTurnIndex when earlier player leaves', () => {
    const { room } = setupPlayingRoom(3);
    room.currentTurnIndex = 2; // Player3's turn
    room.users[0].disconnected = true;

    room.permanentlyRemoveUser('s1');
    assert.equal(room.users.length, 2);
    assert.equal(room.users[room.currentTurnIndex]?.id, 's3', 'Turn must stay on Player3 after Player1 is spliced');
    room.destroy();
});

test('2-player objection requires unanimity (cannot cancel unilaterally)', async () => {
    const { room } = setupPlayingRoom(2);
    objectionHandler.startObjection(room, 's1');
    assert.ok(room.objection);

    // Player2 votes false -> must reject objection and remain PLAYING
    objectionHandler.voteObjection(room, 's2', false);
    assert.equal(room.objection, null);
    assert.equal(room.gameState, 'PLAYING');
    room.destroy();
});

test('MirrorShield + TimeBomb sets casterId to attacker so defusing does not hit shield owner', () => {
    const { room } = setupPlayingRoom(2);
    room.users[0].joker = 7; // TimeBomb
    room.users[1].mirrorRoundsLeft = 2;

    const ok = JokerManager.executeJoker(room, 's1', { targetId: 's2' });
    assert.equal(ok, true);
    assert.ok(room.users[0].timeBomb, 'Bomb must reflect onto attacker s1');
    assert.equal(room.users[0].timeBomb.casterId, 's1', 'Reflected bomb casterId must be attacker, not shield owner');
    room.destroy();
});

test('MirrorShield + BloodTie does not self-link attacker', () => {
    const { room } = setupPlayingRoom(2);
    room.users[0].joker = 5; // BloodTie
    room.users[1].mirrorRoundsLeft = 2;

    const ok = JokerManager.executeJoker(room, 's1', { targetId: 's2' });
    assert.equal(ok, true);
    assert.equal(room.users[0].bloodTieTarget, null, 'Attacker must not be blood-tied to themselves');
    room.destroy();
});

test('MindWiper rejects <3 char words and blocks guessing placeholder while waiting for mirror word', async () => {
    const { room } = setupPlayingRoom(2);
    room.users[0].joker = 4; // MindWiper

    // Reject 1-char word
    const bad = JokerManager.executeJoker(room, 's1', { targetId: 's2', newWord: 'a' });
    assert.equal(bad, false);

    // Reflect MindWiper via MirrorShield
    room.users[1].mirrorRoundsLeft = 2;
    const ok = JokerManager.executeJoker(room, 's1', { targetId: 's2', newWord: 'Karpuz' });
    assert.equal(ok, true);
    assert.equal(room.users[0].isWaitingMirrorWord, true);

    // Attacker tries to exploit placeholder text "AYNA"
    await guessHandler.guessWord(room, 's1', 'ayna');
    assert.equal(room.winners.length, 0, 'Player must not win by guessing mirror placeholder');
    room.destroy();
});

test('guessHandler rejects multi-word packing exploit', async () => {
    const { room } = setupPlayingRoom(2);
    room.users[0].assignedWord = 'Ronaldo';

    await guessHandler.guessWord(room, 's1', 'messi ronaldo neymar mbappe');
    assert.equal(room.winners.length, 0, 'Multi-word packing must not count as a correct guess');
    assert.equal(room.users[0].lives, 2, 'Wrong guess must deduct 1 life');
    room.destroy();
});

test('2-player correct guess only marks the guesser as winner, not the remaining loser', async () => {
    const { room } = setupPlayingRoom(2);
    room.users[0].assignedWord = 'Ronaldo';
    room.users[1].assignedWord = 'Messi';

    await guessHandler.guessWord(room, 's1', 'Ronaldo');
    assert.equal(room.gameState, 'ROUND_END');
    assert.deepEqual(room.winners, ['s1']);
    assert.equal(room.winners.includes('s2'), false);
    room.destroy();
});

test('Room.updateSettings only allows host in LOBBY and validates values', () => {
    const io = createMockIo();
    const room = new Room('SET01', io);
    room.addUser('s1', 'Host', null);
    room.addUser('s2', 'Player2', null);

    const nonHostResult = room.updateSettings('s2', { map: 'snow.glb', theme: 'night' });
    assert.equal(nonHostResult, false);
    assert.equal(room.map, 'floating_island__low_poly_vr.glb');

    const hostResult = room.updateSettings('s1', {
        category: 'Ünlüler',
        map: 'snow.glb',
        theme: 'night',
        bettingEnabled: true,
        betAmount: 250,
        jokersEnabled: false
    });
    assert.equal(hostResult, true);
    assert.equal(room.category, 'Ünlüler');
    assert.equal(room.map, 'snow.glb');
    assert.equal(room.theme, 'night');
    assert.equal(room.isBettingEnabled, true);
    assert.equal(room.betAmount, 250);
    assert.equal(room.isJokersEnabled, false);

    room.updateSettings('s1', { map: 'hacked.glb', betAmount: 999999 });
    assert.equal(room.map, 'snow.glb');
    assert.equal(room.betAmount, 250);
    room.destroy();
});

test('Blitz gameMode sets turnTime to 30s and classic keeps 60s', async () => {
    const payloadValidator = require('../game/validators/payloadValidator');
    const room = new Room('BLITZ1', createMockIo());
    room.addUser('s1', 'Host', null, 'Warrior');
    room.addUser('s2', 'Player2', null, 'Warrior');

    const val = payloadValidator.validateGameStart({ gameMode: 'blitz', jokersEnabled: false }, room.users[0], room);
    assert.equal(val.ok, true);
    assert.equal(val.data.gameMode, 'blitz');

    room.updateSettings('s1', { gameMode: 'blitz' });
    assert.equal(room.gameMode, 'blitz');
    assert.equal(room.turnTime, 30);

    await room.startGame(val.data);
    assert.equal(room.gameMode, 'blitz');
    assert.equal(room.turnTime, 30);

    room.gameState = 'LOBBY';
    await room.startGame({ gameMode: 'classic', jokersEnabled: false });
    assert.equal(room.gameMode, 'classic');
    assert.equal(room.turnTime, 60);

    room.destroy();
});
