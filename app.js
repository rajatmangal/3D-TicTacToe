var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');
var socket = require('socket.io');
var router = express.Router();

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
  if(!req.user)
  {
    res.redirect("/login");
  }
  else {
    res.render("home", {user: req.user});
  }

  //res.send("You are on the Home page!");
});

app.get('/leaderBoard', function(req, res) {
  if(req.user){
    User.find({}, function(err, users) {
      users.sort(function(a, b) {
        var pointA = a.totalPoints;
        var pointB = b.totalPoints;
        if (pointA < pointB) {
          return 1;
        }
        else {
          if(pointA > pointB) {
            return -1;
          }
          else {
            return 0;
          }
        }
      });
      res.render('leaderBoard', {user: req.user,users: users});
    });
  }
  else {
    res.redirect("/login");
  }
});


app.get('/stats', function(req, res) {
  if(req.user){
    res.render('stats', {user: req.user});
  }
  else {
    res.redirect("/login");
  }
});


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
  var gender = req.body.gender;
  var age = req.body.age;
  var newUser = new User({firstName: firstName, lastName: lastName, username: username, email: email, age: age, gender: gender, gamesWon: 0, gamesLost: 0, totalPoints: 0});
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
    res.render('login');
  }

});

app.get('/features', function(req, res) {
  if(loggedIn(req, res)) {
    res.render('features', {user: req.user});
  }
  else {
    res.redirect("/");
  }
});


app.get('/profile', function(req, res) {
  if(loggedIn(req, res)) {
    res.render('profile', {user: req.user});
  }
  else {
    res.redirect('/login');
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
      var gamesWon1;
      var totalPoints1;

      User.find({username: data.username}, function(err, user) {
        if(err) {
          throw err;
        }
        gamesWon1 = user[0].gamesWon + 1;
        totalPoints1 = user[0].totalPoints + 10;

        User.update({username: data.username}, {$set: {gamesWon: gamesWon1, totalPoints: totalPoints1}}, function(err, result) {
          if (err) {
            throw err;
          }
          var timeStarted;

          if (data.start1 != undefined) {
            timeStarted = data.start1;
          }
          else {
            timeStarted = data.start2;
          }
          User.update({username: data.username}, {$push: {games: {gameStart: timeStarted, gameEnd: Date.now(), result: "won", moves: data.moves}}}, function(err, result) {
            if(err){
              throw err;
            }
            console.log(result);
          });
        });
        io.sockets.to(data.room).emit('playerWon', data);
      });

    });

    socket.on("quit", function(data) {
      var gamesLost1;
      var totalPoints1;

      User.find({username: data.username}, function(err, user) {
        gamesLost1 = user[0].gamesLost + 1;
        totalPoints1 = user[0].totalPoints - 5;
        //console.log("user is: " + user[0].username + "  " + user[0].gamesWon);
        User.update({username: data.username}, {$set: {gamesLost: gamesLost1, totalPoints: totalPoints1}}, function(err, result) {
          if (err) {
            throw err;
          }
          var timeStarted;
          if (data.start1 != undefined) {
            timeStarted = data.start1;
          }
          else {
            timeStarted = data.start2;
          }
          User.update({username: data.username}, {$push: {games: {gameStart: timeStarted, gameEnd: Date.now(), result: "lost", moves: data.moves}}}, function(err, result) {
            console.log(result);
            socket.broadcast.to(data.room).emit("quit", data);
          });
        });
      });
    });

    socket.on("increasePoints", function(data) {
      var gamesWon1;
      var totalPoints1;

      User.find({username: data.username}, function(err, user) {
        if(err) {
          throw err;
        }
        gamesWon1 = user[0].gamesWon + 1;
        totalPoints1 = user[0].totalPoints + 10;

        User.update({username: data.username}, {$set: {gamesWon: gamesWon1, totalPoints: totalPoints1}}, function(err, result) {
          if (err) {
            throw err;
          }
          var timeStarted;

          if (data.start1 != undefined) {
            timeStarted = data.start1;
          }
          else {
            timeStarted = data.start2;
          }
          User.update({username: data.username}, {$push: {games: {gameStart: timeStarted, gameEnd: Date.now(), result: "won", moves: data.moves}}}, function(err, result) {
            if(err){
              throw err;
            }
            console.log(result);
          });
        });
      });
    });

    socket.on('losers', function(data) {
      socket.broadcast.to(data.room).emit("losers", data);
    });

    socket.on('reducePoints', function(data) {
      var gamesLost1;
      var totalPoints1;
      //console.log("data username is: " + data.username);
      User.find({username: data.username}, function(err, user) {
        gamesLost1 = user[0].gamesLost + 1;
        totalPoints1 = user[0].totalPoints - 5;
        //console.log("user is: " + user[0].username + "  " + user[0].gamesWon);
        User.update({username: data.username}, {$set: {gamesLost: gamesLost1, totalPoints: totalPoints1}}, function(err, result) {
          if (err) {
            throw err;
          }
          var timeStarted;
          if (data.start1 != undefined) {
            timeStarted = data.start1;
          }
          else {
            timeStarted = data.start2;
          }
          User.update({username: data.username}, {$push: {games: {gameStart: timeStarted, gameEnd: Date.now(), result: "lost", moves: data.moves}}}, function(err, result) {
            console.log(result);
          });
        });
      });

    });
});
