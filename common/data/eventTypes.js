const TYPES = {
    TRANSFER: 'transfer',
    REWARD: 'reward',
    REPLY: 'reply',
    MENTION: 'mention',
    UPVOTE: 'upvote',
    SUBSCRIBE: 'subscribe',
    VOTE_LEADER: 'voteLeader',
    UNVOTE_LEADER: 'unvoteLeader',
    REFERRAL_REGISTRATION_BONUS: 'referralRegistrationBonus',
    REFERRAL_PURCHASE_BONUS: 'referralPurchaseBonus',
};

const TRANSFER_LIKE_TYPES = [
    TYPES.TRANSFER,
    TYPES.REWARD,
    TYPES.REFERRAL_REGISTRATION_BONUS,
    TYPES.REFERRAL_PURCHASE_BONUS,
];

module.exports = {
    TYPES,
    TRANSFER_LIKE_TYPES,
};
