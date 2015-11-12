[![Build Status](https://travis-ci.org/anyTV/anytv-node-quota.svg?branch=master)](https://travis-ci.org/anyTV/anytv-node-quota)

AnyTV Middleware for Quota
=====


####Requirements
```
npm install anytv-node-quota --save
npm install anytv-node-mysql --save
```

####How to use
```javascript
// include packages
const quota = require('anytv-node-quota')
const mysql = require('anytv-node-mysql')

....
// add db key 'accounts_db' to anytv-node-mysql
mysq.add('accounts_db', config.ACCOUNTS_DB)

// create instance of quota store by passing anytv-node-mysql db instance
let quota_store = quota.store.create(mysql)
// create instance of quota middleware by passing (<instance of quota_store>, <service name>, <log request>)
let quota_middleware = quota.middleware(quota_store, 'default', true)

....
// use quota in your routes and controllers
router.get('/', (req, res) => {
	// set endpoint weight
	res.anytv_quota.set_weight(1)

	// some codes here

	res.send({success: 'it is working.'})
})
 ```
