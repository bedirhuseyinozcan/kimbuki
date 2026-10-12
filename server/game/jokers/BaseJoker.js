class BaseJoker {
    constructor(id, name, rarity = 'common') {
        this.id = id;
        this.name = name;
        this.rarity = rarity;
    }

    /**
     * Executes the joker effect.
     * @param {object} room - Room instance
     * @param {object} user - The player using the joker
     * @param {object} payload - Data provided by player (targetId, newWord, etc.)
     * @param {object} context - Execution context (e.g. initialTargetId, targetId with mirror resolved)
     * @returns {boolean} Whether the joker was successfully consumed
     */
    execute(room, user, payload, context) {
        throw new Error(`execute() not implemented for joker ${this.name} (id: ${this.id})`);
    }
}

module.exports = BaseJoker;
