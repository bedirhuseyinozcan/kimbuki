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

    // Packing multiple names into one guess must fail
    await guessHandler.guessWord(room, 's1', 'messi ronaldo neymar mbappe');
    assert.equal(room.winners.length, 0, 'Multi-word packing must not count as a correct guess');
    assert.equal(room.users[0].lives, 2, 'Wrong guess must deduct 1 life');
    room.destroy();
});
