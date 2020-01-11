require('dotenv').config();

const express = require('express');
const exphbs  = require('express-handlebars');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const app = express();

(() => {
  app.engine('handlebars', exphbs());
  app.set('view engine', 'handlebars');

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(express.static('public'));
  app.use(cookieParser());
  app.use('/', require('./routes'));

  app.listen(3001, () => {
    console.log('Interface listening on port 3001!');
  });
})();
