const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const catalog = require('../config/catalog');
const JokerManager = require('../game/jokers');

function extractIdsFromBlock(source, constName) {
    const startIdx = source.indexOf(`export const ${constName}`);
    assert.notEqual(startIdx, -1, `${constName} not found in client types.tsx`);
    const endIdx = source.indexOf('];', startIdx);
    const block = source.slice(startIdx, endIdx);
    const ids = [];
    const regex = /id:\s*['"]([^'"]*)['"]/g;
    let match;
    while ((match = regex.exec(block)) !== null) {
        ids.push(match[1]);
    }
    return ids;
}

function extractNumericIdsFromBlock(source, constName) {
    const startIdx = source.indexOf(`export const ${constName}`);
    assert.notEqual(startIdx, -1, `${constName} not found in client types.tsx`);
    const endIdx = source.indexOf('];', startIdx);
    const block = source.slice(startIdx, endIdx);
    const ids = [];
    const regex = /id:\s*(\d+)/g;
    let match;
    while ((match = regex.exec(block)) !== null) {
        ids.push(Number(match[1]));
    }
    return ids;
}

test('server catalog cosmetics stay strictly in sync with client types.tsx', () => {
    const clientTypesPath = path.resolve(__dirname, '../../client/components/game/types.tsx');
    if (!fs.existsSync(clientTypesPath)) return;

    const source = fs.readFileSync(clientTypesPath, 'utf8');

    const serverAvatars = [catalog.FREE_DEFAULTS.avatar, ...catalog.PREMIUM_AVATARS.map(x => x.id)];
    const clientAvatars = extractIdsFromBlock(source, 'AVATARS');
    assert.deepEqual(serverAvatars.sort(), clientAvatars.sort());

    const serverPedestals = [catalog.FREE_DEFAULTS.pedestal, ...catalog.PREMIUM_PEDESTALS.map(x => x.id)];
    const clientPedestals = extractIdsFromBlock(source, 'PEDESTALS');
    assert.deepEqual(serverPedestals.sort(), clientPedestals.sort());

    const serverColors = [catalog.FREE_DEFAULTS.nameColor, ...catalog.PREMIUM_COLORS.map(x => x.id)];
    const clientColors = extractIdsFromBlock(source, 'NAME_COLORS');
    assert.deepEqual(serverColors.sort(), clientColors.sort());

    const serverTitles = [catalog.FREE_DEFAULTS.title, ...catalog.PREMIUM_TITLES.map(x => x.id)];
    const clientTitles = extractIdsFromBlock(source, 'TITLES');
    assert.deepEqual(serverTitles.sort(), clientTitles.sort());
});

test('server joker registry stays strictly in sync with client JOKERS list', () => {
    const clientTypesPath = path.resolve(__dirname, '../../client/components/game/types.tsx');
    if (!fs.existsSync(clientTypesPath)) return;

    const source = fs.readFileSync(clientTypesPath, 'utf8');
    const clientJokerIds = extractNumericIdsFromBlock(source, 'JOKERS').sort((a, b) => a - b);
    const serverJokerIds = Object.keys(JokerManager.jokers || {}).map(Number).sort((a, b) => a - b);

    assert.ok(clientJokerIds.length > 0);
    if (serverJokerIds.length > 0) {
        assert.deepEqual(serverJokerIds, clientJokerIds);
    }
});
