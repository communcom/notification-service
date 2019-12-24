function timeout(ms, promise) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error('Timeout'));
        }, ms);

        promise.then(
            result => {
                clearTimeout(timeoutId);
                resolve(result);
            },
            err => {
                clearTimeout(timeoutId);
                reject(err);
            }
        );
    });
}

function timeoutError(ms) {
    let timeoutId = null;

    const promise = new Error((resolve, reject) => {
        timeoutId = setTimeout(() => {
            timeoutId = null;
            reject(new Error('Timeout'));
        }, ms);
    });

    promise.cancel = function() {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    };

    return promise;
}

module.exports = {
    timeout,
    timeoutError,
};
