function extractAlias(communityName) {
    // TODO: Temporary fix duplication
    if (communityName === 'cats') {
        return 'cats1';
    }

    const permlink = communityName
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, '-')
        .replace(/[^a-z0-9-]+/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');

    if (permlink.length === 0) {
        console.error(`Invalid community name (empty resulting permlink): "${communityName}"`);
        throw new Error('Invalid community name');
    }

    return permlink;
}

function normalizeCommunityName(name) {
    switch (name) {
        case "Meme's":
            return 'Memes';
        case "Coub's":
            return 'Coub';
        default:
            return name;
    }
}

module.exports = {
    extractAlias,
    normalizeCommunityName,
};
