const Joi = require('joi');
var path = require('path');
Joi.objectId = require('joi-objectid')(Joi);
var exphbs = require('express-handlebars');
const mongoose = require('mongoose');
const express = require('express');
var session = require('express-session');
var cookie_parser = require('cookie-parser');
var body_parser = require('body-parser');
var pg = require('pg');
const app = express();

var routes = require('./routes/users');
//var users = require('./routes/users');
//var login = require('./routes/auth');

var conString = "postgres://postgres:1@localhost:5432/academics";
var client = new pg.Client(conString);
client.connect()
    .then(() => console.log('Now connected to postgres!'))
    .catch(err => console.error('Something went wrong',err));
 
app.set('views',path.join(__dirname,'views'));
//app.engine('handlebars',exphbs({defaultLayout : 'layout'}));
app.set('view engine','ejs');

app.use(body_parser.json());
app.use(body_parser.urlencoded({extended:false}));
app.use(cookie_parser());
app.use(session({
    secret : 'secret',
    resave: true,
    saveUninitialized: true
}));
app.use(express.static(path.join(__dirname,'public')));
app.use(express.json());
app.use('/', routes);
//app.use('/users', users);
//app.use('/loggedin',login);
 
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Listening on port ${port}...`));