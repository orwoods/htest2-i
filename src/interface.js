const request = require('request-promise');

const apiRequest = async(req, res, method, url, settings, retry) => {
  const address = process.env.API_URL + url;

  if (!settings) {
    settings = {};
  }

  if (typeof settings.json == 'undefined') {
    settings.json = true;
  }

  if (typeof retry == 'undefined') {
    retry = true;
  }

  if (!settings.headers) {
    settings.headers = {};
  }

  if (!settings.headers['user-agent']) {
    settings.headers['user-agent'] = req.get('User-Agent');
  }

  if (['post', 'get'].indexOf(method) == -1) {
    method = 'get';
  }

  settings.method = method;
  settings.url = address;
  settings.resolveWithFullResponse = true;

  if (req.cookies[process.env.COOKIE_TOKEN_ACCESS]) {
    settings.auth = {
      'bearer': req.cookies[process.env.COOKIE_TOKEN_ACCESS]
    };
  }

  console.log(address);

  try {
    const response = await request(settings);

    return {
      code: response.statusCode,
      body: response.body
    };
  } catch (response) {
    let code = response.statusCode;
    let body = response.response.body;

    if (retry && (code == 401 || code == 403)) {
      const updated = await refreshToken(req, res);
      if (!updated) {
        console.log('refresh not ok');

        throw body;
      }

      console.log('refresh ok');

      response = await apiRequest(req, res, method, url, settings);
      code = response.code;
      body = response.body;
    }

    return {code, body};
  }
};

const refreshToken = async(req, res) => {
  if (!req.cookies[process.env.COOKIE_TOKEN_REFRESH]) {
    return false;
  }

  const response = await apiRequest(req, res, 'post', `/token/refresh`, {
    auth: {
      'bearer': req.cookies[process.env.COOKIE_TOKEN_REFRESH]
    }
  }, false);

  if (response.code != 200) {
    return false;
  }

  res.cookie(process.env.COOKIE_TOKEN_ACCESS, response.body.access);
  res.cookie(process.env.COOKIE_TOKEN_REFRESH, response.body.refresh);

  req.cookies[process.env.COOKIE_TOKEN_ACCESS] = response.body.access;
  req.cookies[process.env.COOKIE_TOKEN_REFRESH] = response.body.refresh;

  return true;
};

module.exports = {
  index: async(req, res) => {
    let response;

    try {
      response = await apiRequest(req, res, 'get', '/matches');
    } catch (e) {
      return res.redirect('/login');
    }

    res.render('index', {
      logged: true,
      matches: response.body,
      error: req.query.error ? req.query.error : null
    });
  },

  bet: async(req, res) => {
    const matchId = req.params.matchId;
    const teamId = req.params.teamId;

    let response;

    try {
      response = await apiRequest(req, res, 'post', `/matches/${matchId}/bet/${teamId}`);
    } catch (e) {
      return res.redirect('/');
    }

    console.log(response.body);

    if (response.code != 200) {
      return res.redirect('/?error=' + encodeURIComponent(response.body.text ? response.body.text : 'Unknown error'));
    }

    res.redirect('/');
  },

  loginForm: async(req, res) => {
    res.render('login', {
      logged: false,
      error: req.query.error ? req.query.error : null
    });
  },

  login: async(req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    
    if (!username || !password) {
      return res.redirect('/login?error=' + encodeURIComponent('Username and password required'));
    }

    let response;

    try {
      response = await apiRequest(req, res, 'post', `/token/create`, {
        form: {
          username,
          password
        }
      }, false);
    } catch (e) {
      return res.redirect('/login');
    }

    if (response.code != 200) {
      return res.redirect('/login?error=' + encodeURIComponent(response.body.text ? response.body.text : 'Unknown error'));
    }

    res.cookie(process.env.COOKIE_TOKEN_ACCESS, response.body.access);
    res.cookie(process.env.COOKIE_TOKEN_REFRESH, response.body.refresh);

    res.redirect('/');
  },

  logout: async(req, res) => {
    res.clearCookie(process.env.COOKIE_TOKEN_ACCESS);
    res.clearCookie(process.env.COOKIE_TOKEN_REFRESH);

    res.redirect('/login');
  },

  redirectIfUnauthrized: async(req, res, next) => {
    if (!req.cookies[process.env.COOKIE_TOKEN_REFRESH]) {
      return res.redirect('/login');
    }

    next();
  }
};