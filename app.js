var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');
var socket = require('socket.io');

var User = require('./models/user');

var app = express();

var gameNumber = 0;

app.use(express.static("public"));

app.set("view engine" , "ejs");


mongoose.connect('mongodb://localhost/tictactoe');
var db = mongoose.connection;

// Adding passport configuration
app.use(session({
  secret: "You can write anything you can feel like here",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate())); // User.authenticate method comes with passportLocalMongoose
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(bodyParser.urlencoded({extended: true}));


// Home Page
app.get('/', function(req, res) {
  res.render("home");
  //res.send("You are on the Home page!");
})


// Adding route for registering
app.get('/register', function(req, res) {
  res.render("register");
});

app.post('/register', function(req, res) {
  // Here we will add the user into the database (we will use User.register provide by passportLocalMongoose)
  var firstName = req.body.firstName;
  var lastName = req.body.lastName;
  var username = req.body.username;
  var email = req.body.email;
  var newUser = new User({firstName: firstName, lastName: lastName, username: username, email: email});
  User.register(newUser, req.body.password, function(err, user) {
    if(err) {
      console.log(err);
      return res.render('register.ejs');
    }
    else {
      passport.authenticate('local')(req, res, function() {
        res.redirect('/');
      });
    }
  }); // It stores password as a hash

});

// Login Form
app.get('/login', function(req, res) {
  if(loggedIn(req, res)) {
    res.redirect('/');
  }
  else {
    res.render('login.ejs');
  }

});

// Below passport.authenticate is the middleware that would run first when a post request to /login comes up
app.post('/login', passport.authenticate("local",
        {
          successRedirect: '/',
          failureRedirect: '/login'
        }), function(req, res) {
});


// Logout logic
app.get('/logout', function(req, res) {
  req.logout(); // This comes from the packages that we have installed
  res.redirect('/login');
});



// Middleware to determine if a user is logged in (We can put this loggedIn middleware in any route)
function loggedIn(req, res) {
  return req.isAuthenticated();
}



var server = app.listen(3000, function(req, res) {
  console.log("Listening to port 3000");
});

var io = socket(server);

io.on('connection',function(socket){
  socket.on('startNewGame', function(data){
        gameNumber += 1;
        socket.join(gameNumber);
        socket.emit('newGame', {
          name: data.name,
          room:gameNumber
        });
    });

    socket.on('joinExistingGame', function(data){
        var room = io.nsps['/'].adapter.rooms[data.room];
        if( room && room.length == 1){
            socket.join(data.room);
            socket.broadcast.to(data.room).emit('player1', {});
            socket.emit('player2', {
              name: data.name,
              room: data.room
            })
        }
        else if( room == "undefined"){
          socket.emit('err', {
            message: 'The game with id:- ' + data.room + 'has not been initialized. You can either enter a different id or start a new game.'
          });
        }
        else {
            socket.emit('err', {
              message: 'Sorry, The room is full!'
            });
        }
    });

    socket.on('playTurn', function(data){
        socket.broadcast.to(data.room).emit('turnPlayed', {
            tile: data.tile,
            room: data.room
        });
    });

    socket.on('gameEnded', function(data){
        socket.broadcast.to(data.room).emit('gameEnd', data);
    });

    socket.on('playerWon', function(data) {
      io.sockets.to(data.room).emit('playerWon', data);
    });
});
