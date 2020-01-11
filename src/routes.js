const express = require('express');
const router = express.Router();

const interface = require('./interface');

router.get('/login', interface.loginForm);
router.post('/login', interface.login);
router.get('/logout', interface.logout);

router.use('*', interface.redirectIfUnauthrized);

router.get('/', interface.index);
router.get('/bet/:matchId/:teamId', interface.bet);

module.exports = router;