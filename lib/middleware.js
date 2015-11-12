'use strict';

var http = require('http');

module.exports = function (store) {
    var service = arguments.length <= 1 || arguments[1] === undefined ? 'default' : arguments[1];
    var log_request = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

    // create middleware
    return function (req, res, next) {

        function start() {
            var access_token = get_bearer_token(req);

            // if no access_token return error
            if (!access_token.length) {
                res.json({ error: 'No access token.' });
            }

            store.get_client_id(access_token, check_limit);
        }

        function check_limit(err, client_id) {
            if (err) {
                return res.json({ error: err });
            }

            store.exceed_limit(client_id, service, function (err, exceeded) {
                if (err) {
                    return res.json({ error: err });
                }

                if (exceeded) {
                    return res.json({ error: 'Quota exceeded.' });
                }

                bind_quota(client_id);
            });
        }

        function bind_quota(client_id) {
            // save original res.send
            var orig_send = res.send;
            var orig_json = res.json;

            res.anytv_quota = {
                weight: 0,
                client: {
                    id: null,
                    secret: null,
                    token: null
                },
                set_weight: function set_weight() {
                    var weight = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];

                    res.anytv_quota.weight = weight;

                    return res;
                }
            };

            res.send = function (data) {
                var weight = res.anytv_quota.weight;

                clean_up();
                res.send(data);

                // increment_usage
                store.increment_usage(client_id, service, weight);

                // log request
                if (log_request) {
                    store.log_request(client_id, service, weight, req.path);
                }
            };

            res.json = function (data) {
                var weight = res.anytv_quota.weight;

                clean_up();
                res.json(data);

                // increment_usage
                store.increment_usage(client_id, service, weight);

                // log request
                if (log_request) {
                    store.log_request(client_id, service, weight, req.path);
                }
            };

            function clean_up() {
                res.json = orig_json;
                res.send = orig_send;
            }

            next();
        }

        function get_bearer_token(req) {
            var header_token = req.get('Authorization');
            var get_token = req.query.access_token;
            var post_token = req.body ? req.body.access_token : undefined;

            var method_used = (header_token !== undefined) + (get_token !== undefined) + (post_token !== undefined);

            if (method_used === 0) {
                return '';
            }

            // Header: http://tools.ietf.org/html/rfc6750#section-2.1
            if (header_token) {
                var matches = header_token.match(/Bearer\s(\S+)/);

                if (!matches) {
                    return '';
                }

                header_token = matches[1];
            }

            return header_token || post_token || get_token;
        }

        start();
    };
};