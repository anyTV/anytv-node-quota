class Store {
    constructor(db) {
        this.db = db
    }

    get_client_id(access_token, callback) {
        this.db.use('accounts_db').query(['SELECT client_id FROM oauth_access_tokens',
            'WHERE access_token_id = ? LIMIT 1'].join(' '),
            [access_token],
            (err, result) => {
                if (err) {
                    return callback(err)
                }

                if (!result.length) {
                    return callback('Client ID not found')
                }

                callback(null, result[0].client_id)
            }
        ).end();
    }

    increment_usage(client_id, service, weight, callback = () => null) {
        this.db.use('accounts_db').query(['UPDATE app_usage',
            'SET quota_usage = quota_usage + ? ',
            'WHERE client_id = ? AND service = ?'].join(' '),
            [weight, client_id, service],
            callback
        ).end();
    }

    exceed_limit(client_id, service, callback) {
        this.db.use('accounts_db').query(['SELECT `quota_usage`, `limit` FROM app_usage',
            'WHERE client_id = ? AND service = ? LIMIT 1'].join(' '),
            [client_id, service],
            (err, result) => {
                if (err) {
                    return callback(err)
                }


                if (!result.length) {
                    return callback('Client not found.')
                }

                let client = result[0]
                let is_exceeded = (client.quota_usage >= client.limit)

                callback(null, is_exceeded)
            }
        ).end();

    }

    log_request(client_id, service, weight, path, callback = () => null) {
        this.db.use('accounts_db').query(['INSERT INTO app_usage_logs SET ?'].join(' '),
            { client_id, service, path, weight },
            callback
        ).end();
    }
}

export function create (db) {
    return new Store(db)
}
