const core = require('cyberway-core-service');
const { Service, BlockSubscribe } = core.services;
const { Logger } = core.utils;

const MetaModel = require('../../common/models/Meta');
const env = require('../../common/data/env');
const PrismController = require('../controllers/Prism');
const ForkCleaner = require('../controllers/ForkCleaner');
const { getConnector, getSender } = require('../utils/globals');
const { timeout } = require('../utils/timeout');

const ONLINE_NOTIFY_MAX_GAP = 10 * 60 * 1000;

class Prism extends Service {
    async start() {
        let meta = await MetaModel.findOne();

        if (!meta) {
            let initialMeta = {};

            if (env.GLS_NATS_START) {
                initialMeta = JSON.parse(env.GLS_NATS_START);
                Logger.info('Set meta data to:', initialMeta);
            }

            meta = await MetaModel.create(initialMeta);
        }

        this._lastNotificationBlockNum = meta.lastNotificationBlockNum || 0;

        this._prismController = new PrismController();
        this._forkCleaner = new ForkCleaner();

        this._subscriber = new BlockSubscribe({
            handler: async data => {
                try {
                    await this._handleEvent(data);
                } catch (err) {
                    Logger.error('Critical Error!');
                    Logger.error('Block handling failed:', err);
                    process.exit(1);
                }
            },
        });

        if (meta.lastBlockNum) {
            await this._prismController.revertTo(meta.lastBlockNum);
            await this._subscriber.setLastBlockMetaData(meta);
        }

        try {
            await this._subscriber.start();
        } catch (error) {
            Logger.error('Cant start block subscriber:', error);
            process.exit(1);
        }
    }

    async _setLastBlock({ blockNum, sequence }) {
        await MetaModel.updateOne(
            {},
            {
                $set: {
                    lastBlockNum: blockNum,
                    lastBlockSequence: sequence,
                },
            }
        );
    }

    /**
     * Обработка событий из BlockSubscribe.
     * @param {'BLOCK'|'FORK'|'IRREVERSIBLE_BLOCK'} type
     * @param {Object} data
     * @private
     */
    async _handleEvent({ type, data }) {
        switch (type) {
            case BlockSubscribe.EVENT_TYPES.BLOCK:
                if (!env.GLS_GUARANTEED_BLOCK_NUM || data.blockNum > env.GLS_GUARANTEED_BLOCK_NUM) {
                    await this._waitForPrism(data);
                }

                const notifications = await this._handleBlock(data);
                await this._setLastBlock(data);

                if (!env.GLS_DISABLE_SENDING) {
                    await this._processNotifications(notifications, data);
                }
                break;
            case BlockSubscribe.EVENT_TYPES.IRREVERSIBLE_BLOCK:
                await this._handleIrreversibleBlock(data);
                break;
            case BlockSubscribe.EVENT_TYPES.FORK:
                Logger.warn(`Fork detected, new safe base on block num: ${data.baseBlockNum}`);
                await this._handleFork(data.baseBlockNum);
                break;
            default:
        }
    }

    async _waitForPrism(block) {
        const con = getConnector();

        await timeout(
            60000,
            con.callService('prism', 'waitForBlock', {
                blockNum: block.blockNum,
            })
        );
    }

    async _handleBlock(block) {
        try {
            return await this._prismController.processBlock(block);
        } catch (err) {
            Logger.error(`Cant disperse block, num: ${block.blockNum}, id: ${block.id}`, err);
            process.exit(1);
        }
    }

    async _handleIrreversibleBlock(block) {
        await this._forkCleaner.clearRevertData(block.blockNum);
    }

    async _processNotifications(notifications, block) {
        if (notifications.length && block.blockNum > this._lastNotificationBlockNum) {
            this._lastNotificationBlockNum = block.blockNum;

            await MetaModel.updateOne(
                {},
                {
                    $set: {
                        lastNotificationBlockNum: block.blockNum,
                    },
                }
            );

            if (new Date(block.blockTime).getTime() >= Date.now() - ONLINE_NOTIFY_MAX_GAP) {
                await getSender().processNotifications(notifications, block.blockTime);
            }
        }
    }

    async _handleFork(baseBlockNum) {
        try {
            await this._prismController.processFork(baseBlockNum);
        } catch (err) {
            Logger.error('Critical error!');
            Logger.error('Cant revert on fork:', err);
            process.exit(1);
        }
    }
}

module.exports = Prism;
