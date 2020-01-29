# Notification service

## Base structures

### Notification

Types of notifications:

-   [subscribe](#type-subscribe)
-   [upvote](#type-upvote)
-   [reply](#type-reply)
-   [mention](#type-mention)
-   list will grow in future...

#### Type "subscribe"

```json
{
    "id": "6058be37344ffe68043917588e9581749bb56c55",
    "eventType": "subscribe",
    "timestamp": "2020-01-11T20:35:45.000Z",
    "userId": "tst1sykkeaax",
    "user": {
        "userId": "cmn1kveyyequ",
        "username": "inigomontoya",
        "avatarUrl": null
    },
    "isNew": false
}
```

#### Type "upvote"

```json
{
    "id": "53ac9d67cb3e5ce715e220b8250bbcdbb0b95395",
    "eventType": "upvote",
    "timestamp": "2020-01-06T18:40:54.000Z",
    "community": {
        "communityId": "DESIGN",
        "name": "Design",
        "alias": "design",
        "avatarUrl": "https://img.commun.com/images/3YFJrdAL9CvaXhAao8v93tsLdsfo.jpg"
    },
    "userId": "tst1sykkeaax",
    "voter": {
        "userId": "catraedsuper",
        "username": "catraed",
        "avatarUrl": "https://img.commun.com/images/42M94z9Lnz4vLtnV983FiJQEEXoM.png"
    },
    "entityType": "post",
    "post": {
        "contentId": {
            "communityId": "DESIGN",
            "userId": "tst1sykkeaax",
            "permlink": "1576879604",
            "username": "swift-shondra-dvm"
        },
        "shortText": "photoshop for windows",
        "imageUrl": "https://img.commun.com/images/37izAerNbhyYgv1p7We1qzU73ysL.png"
    },
    "isNew": false
}
```

#### Type "reply"

```json
{
    "id": "53ac9d67cb3e5ce715e220b8250bbcdbb0b95395",
    "eventType": "reply",
    "timestamp": "2020-01-06T18:40:54.000Z",
    "community": {
        "communityId": "DESIGN",
        "name": "Design",
        "alias": "design",
        "avatarUrl": "https://img.commun.com/images/3YFJrdAL9CvaXhAao8v93tsLdsfo.jpg"
    },
    "userId": "tst1sykkeaax",
    "author": {
        "userId": "catraedsuper",
        "username": "catraed",
        "avatarUrl": "https://img.commun.com/images/42M94z9Lnz4vLtnV983FiJQEEXoM.png"
    },
    "entityType": "comment",
    "comment": {
        "contentId": {
            "communityId": "ANIME",
            "userId": "tst5urobzffe",
            "permlink": "re-1580204390-1580204508",
            "username": "glover-willetta-sr"
        },
        "shortText": "@swift-shondra-dvm sdsdsds",
        "imageUrl": null,
        "parents": {
            "post": {
                "communityId": "ANIME",
                "userId": "tst1sykkeaax",
                "permlink": "1580204390",
                "username": "swift-shondra-dvm"
            },
            "comment": null
        }
    },
    "isNew": false
}
```

#### Type "mention"

```json
{
    "id": "53ac9d67cb3e5ce715e220b8250bbcdbb0b95395",
    "eventType": "mention",
    "timestamp": "2020-01-06T18:40:54.000Z",
    "community": {
        "communityId": "DESIGN",
        "name": "Design",
        "alias": "design",
        "avatarUrl": "https://img.commun.com/images/3YFJrdAL9CvaXhAao8v93tsLdsfo.jpg"
    },
    "userId": "tst1sykkeaax",
    "author": {
        "userId": "catraedsuper",
        "username": "catraed",
        "avatarUrl": "https://img.commun.com/images/42M94z9Lnz4vLtnV983FiJQEEXoM.png"
    },
    "entityType": "post",
    "post": {
        "contentId": {
            "communityId": "DESIGN",
            "userId": "tst1sykkeaax",
            "permlink": "1576879604",
            "username": "swift-shondra-dvm"
        },
        "shortText": "photoshop for windows",
        "imageUrl": "https://img.commun.com/images/37izAerNbhyYgv1p7We1qzU73ysL.png"
    },
    "isNew": false
}
```

## API

-   [getNotifications](#method-getnotifications)
-   [getstatus](#method-getstatus)

### Method "getNotifications"

Запрос:

```json
{
    "jsonrpc": "2.0",
    "method": "notifications.getNotifications",
    "params": {
        "limit": 20,
        "beforeThan": null,
        "filter": ["subscribe", "upvote"]
    },
    "id": 12
}
```

Ответ:

```json
{
    "jsonrpc": "2.0",
    "id": 12,
    "result": {
        "items": [
            "<NOTIFICATION_STRUCTURE>",
            "<NOTIFICATION_STRUCTURE>",
            "<NOTIFICATION_STRUCTURE>",
            "..."
        ],
        "lastNotificationTimestamp": "2020-01-11T20:35:45.000Z"
    }
}
```

### Method "getStatus"

Запрос:

```json
{
    "jsonrpc": "2.0",
    "method": "notifications.getStatus",
    "params": {},
    "id": 12
}
```

Ответ:

```json
{
    "jsonrpc": "2.0",
    "id": 12,
    "result": {
        "unseenCount": 0
    }
}
```
