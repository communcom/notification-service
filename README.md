# Notification service

Content:

-   [Notification types](#notification)
-   [Api](#api)
-   [Events](#events)

## Base structures

### Notification

Types of notifications:

-   [subscribe](#notification-type-subscribe)
-   [upvote](#notification-type-upvote)
-   [reply](#notification-type-reply)
-   [mention](#notification-type-mention)
-   [transfer](#notification-type-transfer)
-   [reward](#notification-type-reward)
-   [referralRegistrationBonus](#notification-type-referralregistrationbonus)
-   [referralPurchaseBonus](#notification-type-referralpurchasebonus)
-   list will grow in future...

In examples of API and Events places where one of these notification will be placed replaced by string "NOTIFICATION_STRUCTURE".

#### Notification type "subscribe"

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

#### Notification type "upvote"

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

#### Notification type "reply"

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

#### Notification type "mention"

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

### Notification type "transfer"

```json
{
    "id": "3dc4a428f9ba5d09ba8d8444a74d79cfcaeee7b2",
    "eventType": "transfer",
    "timestamp": "2020-01-30T11:04:36.000Z",
    "userId": "cmn2hkogmnym",
    "from": {
        "userId": "carbon12labs",
        "username": "carbon12labs",
        "avatarUrl": null
    },
    "amount": "96.7580",
    "pointType": "token",
    "isNew": false
}
```

### Notification type "reward"

```json
{
    "id": "cabb18cf06f8743a670de56e3715f7eee31b9e00",
    "eventType": "reward",
    "timestamp": "2020-01-30T11:38:12.000Z",
    "community": {
        "communityId": "MUSIC",
        "name": "Music",
        "alias": "music",
        "avatarUrl": "https://img.commun.com/images/2eT5QSNQVk4ZRZu6CNVjUiENB9sp.jpg"
    },
    "userId": "tst1sykkeaax",
    "amount": "191.706",
    "tracery": "1221643747888096466",
    "isNew": true
}
```

### Notification type "referralRegistrationBonus"

```json
{
    "id": "3dc4a428f9ba5d09ba8d8444a74d79cfcaeee7b2",
    "eventType": "referralRegistrationBonus",
    "timestamp": "2020-01-30T11:04:36.000Z",
    "userId": "cmn2hkogmnym",
    "from": {
        "userId": "usr1hsdahaa",
        "username": "test-account",
        "avatarUrl": null
    },
    "amount": "96.7580",
    "pointType": "token",
    "isNew": false
}
```

### Notification type "referralPurchaseBonus"

```json
{
    "id": "3dc4a428f9ba5d09ba8d8444a74d79cfcaeee7b2",
    "eventType": "referralPurchaseBonus",
    "timestamp": "2020-01-30T11:04:36.000Z",
    "userId": "cmn2hkogmnym",
    "from": {
        "userId": "usr1hsdahaa",
        "username": "test-account",
        "avatarUrl": null
    },
    "amount": "96.7580",
    "pointType": "token",
    "percent": 5,
    "isNew": false
}
```

## API

-   [getNotifications](#method-getnotifications)
-   [getstatus](#method-getstatus)
-   [subscribe](#method-subscribe)
-   [unsubscribe](#method-unsubscribe)

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
        "unseenCount": 3
    }
}
```

### Method "subscribe"

Запрос:

```json
{
    "jsonrpc": "2.0",
    "method": "notifications.subscribe",
    "params": {},
    "id": 13
}
```

Ответ:

```json
{
    "jsonrpc": "2.0",
    "id": 13,
    "result": {
        "status": "OK"
    }
}
```

### Method "unsubscribe"

Запрос:

```json
{
    "jsonrpc": "2.0",
    "method": "notifications.unsubscribe",
    "params": {},
    "id": 14
}
```

Ответ:

```json
{
    "jsonrpc": "2.0",
    "id": 14,
    "result": {
        "status": "OK"
    }
}
```

## Events

List of events:

-   [statusUpdated](#event-statusupdated)
-   [newNotification](#event-newnotification)

### Event "statusUpdated"

```json
{
    "method": "notifications.statusUpdated",
    "jsonrpc": "2.0",
    "params": {
        "unseenCount": 3
    }
}
```

### Event "newNotification"

```json
{
    "method": "notifications.newNotification",
    "jsonrpc": "2.0",
    "params": "<NOTIFICATION_STRUCTURE>"
}
```
