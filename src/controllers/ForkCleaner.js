const core = require('cyberway-core-service');
const { Logger } = core.utils;

const UserModel = require('../models/User');
const CommunityModel = require('../models/Community');

class ForkCleaner {
    async clearRevertData(blockNum) {
        try {
            await Promise.all([
                this._clearCollectionRevertData(CommunityModel, blockNum),
                this._clearCollectionRevertData(UserModel, blockNum),
            ]);
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
