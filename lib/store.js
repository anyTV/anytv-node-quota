'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.create = create;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Store = (function () {
    function Store(db) {
        _classCallCheck(this, Store);

        this.db = db;
    }

    _createClass(Store, [{
        key: 'get_client_id',
        value: function get_client_id(access_token, callback) {
            this.db.use('accounts_db').query(['SELECT client_id FROM oauth_access_tokens', 'WHERE access_token_id = ? LIMIT 1'].join(' '), [access_token], function (err, result) {
                if (err) {
                    return callback(err);
                }

                if (!result.length) {
                    return callback('Client ID not found');
                }

                callback(null, result[0].client_id);
            }).end();
        }
    }, {
        key: 'increment_usage',
        value: function increment_usage(client_id, service, weight) {
            var callback = arguments.length <= 3 || arguments[3] === undefined ? function () {
                return null;
            } : arguments[3];

            this.db.use('accounts_db').query(['UPDATE app_usage', 'SET quota_usage = quota_usage + ? ', 'WHERE client_id = ? AND service = ?'].join(' '), [weight, client_id, service], callback).end();
        }
    }, {
        key: 'exceed_limit',
        value: function exceed_limit(client_id, service, callback) {
            this.db.use('accounts_db').query(['SELECT `quota_usage`, `limit` FROM app_usage', 'WHERE client_id = ? AND service = ? LIMIT 1'].join(' '), [client_id, service], function (err, result) {
                if (err) {
                    return callback(err);
                }

                if (!result.length) {
                    return callback('Client not found.');
                }

                var client = result[0];
                var is_exceeded = client.quota_usage >= client.limit;

                callback(null, is_exceeded);
            }).end();
        }
    }, {
        key: 'log_request',
        value: function log_request(client_id, service, weight, path) {
            var callback = arguments.length <= 4 || arguments[4] === undefined ? function () {
                return null;
            } : arguments[4];

            this.db.use('accounts_db').query(['INSERT INTO app_usage_logs SET ?'].join(' '), { client_id: client_id, service: service, path: path, weight: weight }, callback).end();
        }
    }]);

    return Store;
})();

function create(db) {
    return new Store(db);
}