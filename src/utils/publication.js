const { smartTrim } = require('./text');

const PREFIXES = {
    tag: '#',
    mention: '@',
};

function formatContentId(contentId) {
    return `${contentId.communityId}/${contentId.userId}/${contentId.permlink}`;
}

function extractPublicationInfo({ contentId, document }) {
    const id = formatContentId(contentId);
    const mentions = new Set();
    let text = null;
    let imageUrl = null;

    if (!document) {
        return {
            id,
            text,
            imageUrl,
            mentions: [],
        };
    }

    if (document.attributes.type === 'article') {
        text = document.attributes.title;
        imageUrl = document.attributes.coverUrl;
    } else {
        let attach = null;
        const textParts = [];

        for (const node of document.content) {
            switch (node.type) {
                case 'paragraph':
                    for (const { type, content } of node.content) {
                        textParts.push(`${PREFIXES[type] || ''}${content}`);

                        if (type === 'mention') {
                            mentions.add(content);
                        }
                    }
                    break;
                case 'attachments':
                    // eslint-disable-next-line prefer-destructuring
                    attach = node.content[0];
                    break;
                default:
                // Do nothing
            }
        }

        text = textParts.join('').trim();

        if (attach) {
            switch (attach.type) {
                case 'image':
                    imageUrl = attach.content;
                    break;

                case 'video':
                case 'embed':
                case 'website':
                    if (attach.attributes) {
                        imageUrl = attach.attributes.thumbnailUrl;
                    }

                    if (!imageUrl && !text) {
                        text = attach.content.trim();
                    }
                    break;

                default:
                // Do nothing;
            }
        }
    }

    if (text) {
        text = text.replace(/\s+/g, ' ').trim();
        text = smartTrim(text, 60, true);
    }

    return {
        id,
        shortText: text,
        imageUrl,
        mentions: [...mentions],
    };
}

module.exports = {
    formatContentId,
    extractPublicationInfo,
};
