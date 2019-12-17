const core = require('cyberway-core-service');
const { Logger } = core.utils;

const UserModel = require('../models/User');
const CommunityModel = require('../models/Community');

class ForkCleaner {
    async clearRevertData(blockNum) {
        // Очищаем устаревшние данные для отката не сразу, а каждый 100й блок (batch-optimization).
        const blockNumMod = blockNum % 100;

        try {
            if (blockNumMod === 0) {
                await this._clearCollectionRevertData(UserModel, blockNum);
            }

            if (blockNumMod === 50) {
                await this._clearCollectionRevertData(CommunityModel, blockNum);
            }
        } catch (err) {
            Logger.warn('ForkCleaner: clearing failed:', err);
        }
    }

    async _clearCollectionRevertData(Model, blockNum) {
        await Model.updateMany(
            {
                'revertLog.blockNum': { $lte: blockNum },
            },
            {
                $pull: {
                    revertLog: {
                        blockNum: { $lte: blockNum },
                    },
                },
            }
        );
    }
}

module.exports = ForkCleaner;
