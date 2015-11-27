'use strict'

const httpMocks = require('node-mocks-http')
const chai = require('chai')
const _ = require('lodash')
const quotaMiddleware = require('../src/middleware')

const assert = chai.assert
const emptyCallback = () => null

const mock_database = {
    'cid1' : {
        'default': {
            client_id: 'cid1',
            quota_usage: 0,
            limit: 10,
        }
    },
    'cid2' : {
        'default': {
            client_id: 'cid2',
            quota_usage: 10,
            limit: 10,
        }
    }
}

const store = {
    set_db: function(db) {
        this.db = db

        return this
    },
    get_db: function() {
        return this.db
    },
    get_client_id: function(access_token, callback) {
        let client = access_token

        if (!client.length) {
            return callback('Client not found', null)
        }

        callback(null, client)
    },
    increment_usage: function(client_id, service, weight, callback = () => null) {
        this.db[client_id][service].quota_usage = this.db[client_id][service].quota_usage + weight

        callback(null, null)
    },
    exceed_limit: function(client_id, service, callback = () => null) {
        let is_exceed = this.db[client_id][service].limit <= this.db[client_id][service].quota_usage

        callback(null, is_exceed)
    },
    log_request(client_id, service, weight, path, callback = () => null) {
        callback()
    }
}

describe('Middleware', () => {
    it('should set default weight', () => {
        let res = httpMocks.createResponse()
        let req = httpMocks.createRequest({
            headers: {
                Authorization: 'Bearer cid1'
            }
        })

        let db = _.clone(mock_database)
        let middleware = quotaMiddleware(store.set_db(db))

        middleware(req, res, () => {
            assert.typeOf(res.anytv_quota.weight, 'number')

            res.json({success: true})
        })

        res.on('end', () => {
            let data = JSON.parse(res._getData())
            assert.typeOf(data.success, 'boolean')
            assert.equal(data.success, true)
        })
    })

    it('should have default weight of 0', () => {
        let res = httpMocks.createResponse()
        let req = httpMocks.createRequest({
            headers: {
                Authorization: 'Bearer cid1'
            }
        })

        let db = _.clone(mock_database)
        let middleware = quotaMiddleware(store.set_db(db))

        middleware(req, res, () => {
            assert.equal(res.anytv_quota.weight, 0)

            res.json({success: true})
        })

        let data = JSON.parse(res._getData())
        assert.typeOf(data.success, 'boolean')
        assert.equal(data.success, true)
    })

    it('should bind new method "set_weight"', () => {
        let res = httpMocks.createResponse()
        let req = httpMocks.createRequest({
            headers: {
                Authorization: 'Bearer cid1'
            }
        })

        let db = _.clone(mock_database)
        let middleware = quotaMiddleware(store.set_db(db))

        middleware(req, res, () => {
            assert.typeOf(res.anytv_quota.set_weight, 'function')
            res.json({success: true})
        })

        let data = JSON.parse(res._getData())
        assert.typeOf(data.success, 'boolean')
        assert.equal(data.success, true)
    })

    it('should succeed if limit not yet meet', () => {
        let res = httpMocks.createResponse()
        let req = httpMocks.createRequest({
            headers: {
                Authorization: 'Bearer cid1'
            }
        })

        let db = _.clone(mock_database)
        let middleware = quotaMiddleware(store.set_db(db))

        middleware(req, res, () => {
            res.json({success: true})
        })

        let data = JSON.parse(res._getData())
        assert.typeOf(data.success, 'boolean')
        assert.equal(data.success, true)
    })

    it('should error if limit is exceeded', () => {
        let res = httpMocks.createResponse()
        let req = httpMocks.createRequest({
            headers: {
                Authorization: 'Bearer cid2'
            }
        })

        let db = _.clone(mock_database)
        let middleware = quotaMiddleware(store.set_db(db))

        middleware(req, res, () => {
            res.anytv_quota.set_weight(10)
            res.json({success: true})
        })

        let data = res._getData()
        assert.typeOf(data.error, 'string')
        assert.equal(data.error, 'Quota exceeded.')
    })

    it('should increment quota usage', () => {
        let db = _.clone(mock_database)
        let middleware = quotaMiddleware(store.set_db(db))

        // first request increment 2
        let res = httpMocks.createResponse()
        let req = httpMocks.createRequest({
            headers: {
                Authorization: 'Bearer cid1'
            }
        })

        middleware(req, res, () => {
            res.anytv_quota.set_weight(2)
            res.json({success: true})
        })

        let data = JSON.parse(res._getData())
        assert.typeOf(data.success, 'boolean')
        assert.equal(data.success, true)
        assert.equal(db['cid1']['default'].quota_usage, 2)

        // second request increment 5
        res = httpMocks.createResponse()
        req = httpMocks.createRequest({
            headers: {
                Authorization: 'Bearer cid1'
            }
        })

        middleware(req, res, () => {
            res.anytv_quota.set_weight(5)
            res.json({success: true})
        })

        data = JSON.parse(res._getData())
        assert.typeOf(data.success, 'boolean')
        assert.equal(data.success, true)
        assert.equal(db['cid1']['default'].quota_usage, 7)
    })
})
