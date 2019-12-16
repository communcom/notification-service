const core = require('cyberway-core-service');
const { Basic: BasicService, BlockSubscribe } = core.services;
const { Logger } = core.utils;
const MetaModel = require('../models/Meta');

const env = require('../data/env');
const PrismController = require('../controllers/Prism');
const ForkCleaner = require('../controllers/ForkCleaner');

class Prism extends BasicService {
    async start() {
        let meta = await MetaModel.findOne();

        if (!meta) {
            meta = await MetaModel.create({});
        }

        this._prismController = new PrismController();
        this._forkCleaner = new ForkCleaner();

        this._subscriber = new BlockSubscribe({
            handler: this._handleEvent.bind(this),
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
                await this._handleBlock(data);
                await this._setLastBlock(data);
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

    async _handleBlock(block) {
        try {
            await this._prismController.processBlock(block);
        } catch (err) {
            Logger.error(`Cant disperse block, num: ${block.blockNum}, id: ${block.id}`, err);
            process.exit(1);
        }
    }

    async _handleIrreversibleBlock(block) {
        await this._forkCleaner.clearRevertData(block.blockNum);
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
