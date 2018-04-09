var socket = io.connect('http://localhost:3000');
var start;
// console.log(start);
// start = Date.now();
// console.log(start);
var start2;
var end;

var Player = function(name, type , username){
    this.name = name;
    this.type = type;
    this.username = username;
    this.currentTurn = true;
    this.playsArr = 0;
}

var Game = function(roomId){
    this.roomId = roomId;
    this.board = new Array();
    for(var i = 0 ; i < 3 ; i++) {
      this.board[i] = new Array()
      for(var j = 0 ; j < 3 ; j++) {
        this.board[i][j] = new Array();
      }
    }
    this.moves = 0;
}

var PlayerOne = 'X', PlayerTwo = 'O';
var player;
var game;
var gameOver = false;


$('#new').on('click', function(){
    var name = $('#new').attr("name");
    var username = $('#new').attr("name1");
    if(!name){
        alert('Please enter your name.');
        return;
    }
    start = new Date();
    socket.emit('startNewGame', {name: name});
    //console.log(username);
    player = new Player(name, PlayerOne , username);
});

$('#join').on('click', function(){
    var name = $('#join').attr("name");
    var username = $('#join').attr("name1")
    roomID = $('#room').val();
    if(!name || !roomID){
        alert('Please enter your name and game ID.');
        return;
    }
    start2 = new Date();
    console.log(start2);
    socket.emit('joinExistingGame', {
      name: name,
      room: roomID,
    });
    //console.log(username);
    player = new Player(name, PlayerTwo, username);
});

$("#quit").on("click", function(){
  var username = $('#quit').attr("name");
  socket.emit("quit", {
    room: game.roomId,
    username: username,
    start1: start,
    start2: start2,
    moves: game.moves

  })
});

socket.on("quit", function(data) {
  var username = $('#quit').attr("name");
  for(var i=0; i<3; i++) {
    for(var j=0; j<3; j++) {
      for(var k=0; k<3; k++) {
        $('#' + i + '' + j + '' + k).off();
        $('#' + i + '' + j + '' + k).on('click', function(){
          alert("Sorry the game is already over. Please start a new game.")
        });
      }
    }
  }
  $('#turn').text("You Won. Your opponent left the game!");
  socket.emit("increasePoints", {
    room: game.roomId,
    username: username,
    start1: start,
    start2: start2,
    moves: game.moves
  });
});

socket.on('newGame', function(data){

    var message = 'Hello, ' + data.name +
        '. Please ask your friend to enter Game ID: ' +
        data.room + '. Waiting for player 2...';

    // Create game for player 1
    game = new Game(data.room);
    $('.menu').css('display', 'none');
    $('#userHello').css('display', 'block');
    $('#userHello').html(message);

    //game.displayBoard(message);
});

//If player creates the game, He is the the host
socket.on('player1', function(data){
    var message = 'Hello, ' + player.getPlayerName();

    // Reset the message for the player
    $('#userHello').html(message);
    $('.gameBoard').css('display', 'block');
    // Set the current player's turn
    player.setCurrentTurn(true);
});

//Joined the game, so player is player 2
socket.on('player2', function(data){
    var message = 'Hello, ' + data.name;

    //Create game for player 2
    game = new Game(data.room);
    $('.menu').css('display', 'none');
    $('.gameBoard').css('display', 'block');
    $('#userHello').html(message);

    // First turn is of player 1, so set to false
    player.setCurrentTurn(false);
});

//Opponent played his turn. Update UI.
socket.on('turnPlayed', function(data){
    //var row = data.tile.split('_')[1][0];
    //var col = data.tile.split('_')[1][1];
    var opponentType = player.getPlayerType() == PlayerOne ? PlayerTwo : PlayerOne;

    $('#'+data.tile).text(opponentType);
    $('#'+data.tile).prop('disabled', true);
    //game.updateBoard(opponentType, row, col, data.tile);
    player.setCurrentTurn(true);
});

socket.on('gameEnd', function(data){
    game.endGame(data.message);
})

socket.on('err', function(data){
  alert(data.message);
  location.reload();
});


socket.on('playerWon', function(data) {
  for(var i=0; i<3; i++) {
    for(var j=0; j<3; j++) {
      for(var k=0; k<3; k++) {
        $('#' + i + '' + j + '' + k).off();
        $('#' + i + '' + j + '' + k).on('click', function(){
          alert("Sorry the game is already over. Please start a new game.")
        });
      }
    }
  }
 $('#turn').text(data.name + ' won' + ". Please check game stats from the dropdown menu for more information.");



  // socket.emit('losers', {
  //   room: game.roomId,
  //   username: $('#turn').attr("name")
  // });
});



var move;
for(var i=0; i<3; i++) {
  for(var j=0; j<3; j++) {
    for(var k=0; k<3; k++) {
      $('#' + i + '' + j + '' + k).on('click', function(){
        if(!player.currentTurn){
            alert('Its not your turn!');
            return;
        }
        if($(this).prop('disabled')){
            alert('This tile has already been played on!');
        }
        var clickedTile = $(this).attr('id');
        var board = parseInt(clickedTile.charAt(0));
        var row = parseInt(clickedTile.charAt(1));
        var col = parseInt(clickedTile.charAt(2));
        game.board[board][row][col] = player.type;

        var turnObj = {
            tile: clickedTile,
            room: game.roomId
        };
        socket.emit('playTurn', turnObj);
        $('#'+this.id).text(player.type);
        $('#'+this.id).prop('disabled', true);
        player.setCurrentTurn(false);
        var won = false;
        if(isWon(game.board[0][0][0],game.board[0][0][1],game.board[0][0][2],game.board[0][1][0],game.board[0][1][1],game.board[0][1][2],game.board[0][2][0],game.board[0][2][1],game.board[0][2][2]))
        {
          won = true;
        }
        else if(isWon(game.board[1][0][0],game.board[1][0][1],game.board[1][0][2],game.board[1][1][0],game.board[1][1][1],game.board[1][1][2],game.board[1][2][0],game.board[1][2][1],game.board[1][2][2]))
        {
          won = true;
        }
        else if(isWon(game.board[2][0][0],game.board[2][0][1],game.board[2][0][2],game.board[2][1][0],game.board[2][1][1],game.board[2][1][2],game.board[2][2][0],game.board[2][2][1],game.board[2][2][2]))
        {
          won = true;
        }
        else if(isWon(game.board[0][0][0],game.board[1][0][0],game.board[2][0][0],game.board[0][1][0],game.board[1][1][0],game.board[2][1][0],game.board[0][2][0],game.board[1][2][0],game.board[2][2][0]))
        {
          won = true;
        }
        else if(isWon(game.board[0][0][1],game.board[1][0][1],game.board[2][0][1],game.board[0][1][1],game.board[1][1][1],game.board[2][1][1],game.board[0][2][1],game.board[1][2][1],game.board[2][2][1]))
        {
          won = true;
        }
        else if(isWon(game.board[0][0][2],game.board[1][0][2],game.board[2][0][2],game.board[0][1][2],game.board[1][1][2],game.board[2][1][2],game.board[0][2][2],game.board[1][2][2],game.board[2][2][2]))
        {
          won = true;
        }
        else if(isWon(game.board[0][0][2],game.board[1][0][2],game.board[2][0][2],game.board[0][1][2],game.board[1][1][2],game.board[2][1][2],game.board[0][2][2],game.board[1][2][2],game.board[2][2][2]))
        {
          won = true;
        }
        else if(isWon(game.board[0][0][2],game.board[1][0][2],game.board[2][0][2],game.board[0][1][2],game.board[1][1][2],game.board[2][1][2],game.board[0][2][2],game.board[1][2][2],game.board[2][2][2]))
        {
          won = true;
        }
        else if(game.board[0][0][0] === game.board[1][1][1] && game.board[1][1][1] === game.board[2][2][2] && (game.board[1][1][1] === 'X' || game.board[1][1][1] === 'O'))
        {
          won = true;
        }
        else if(game.board[0][0][2] === game.board[1][1][1] && game.board[1][1][1] === game.board[2][2][0] && (game.board[1][1][1] === 'X' || game.board[1][1][1] === 'O'))
        {
          won = true;
        }
        else if(game.board[0][2][0] === game.board[1][1][1] && game.board[1][1][1] === game.board[2][0][2] && (game.board[1][1][1] === 'X' || game.board[1][1][1] === 'O'))
        {
          won = true;
        }
        else if(game.board[0][2][2] === game.board[1][1][1] && game.board[1][1][1] === game.board[2][0][0] && (game.board[1][1][1] === 'X' || game.board[1][1][1] === 'O'))
        {
          won = true;
        }
        //console.log(game.board);
      //  console.log(won);
      game.moves++;
        if (won) {
          wonLogic(game.roomId , player.name , player.username);
        }

        //game.checkWinner();
        //this.board[row][col] = type;
        //this.moves ++;
      })
    }
  }
}

function wonLogic(roomId , name , username) {
  var turnObj = {
      room: roomId,
      name: name,
      username: username,
      start1: start,
      start2: start2,
      moves: game.moves

  };
  socket.emit('playerWon', turnObj);
  socket.emit('losers', {
    room: game.roomId,
  });
}

socket.on('losers', function(data) {
  //console.log("Looser is: " + $('#turn').attr("name"));
  //$('#turn').text('You lost' + data.username);
  socket.emit('reducePoints', {
    room: game.roomId,
    username: $('#turn').attr("name"),
    start1: start,
    start2: start2,
    moves: game.moves
  })
});

function isWon(row1Col1,row1Col2,row1Col3,row2Col1,row2Col2,row2Col3,row3Col1,row3Col2,row3Col3)
{
    if(row1Col1 === row1Col2 && row1Col2 === row1Col3 && (row1Col1 === 'X' || row1Col1 === 'O'))
    {
      return true;
    }
    else if(row2Col1 === row2Col2 && row2Col2 === row2Col3 && (row2Col1 === 'X' || row2Col1 === 'O'))
    {
      return true;
    }
    else if(row3Col1 === row3Col2 && row3Col2 === row3Col3 && (row3Col1 === 'X' || row3Col1 === 'O'))
    {
      return true;
    }
    else if(row1Col1 === row2Col1 && row2Col1 === row3Col1 && (row1Col1 === 'X' || row1Col1 === 'O'))
    {
      return true;
    }
    else if(row1Col2 === row2Col2 && row2Col2 === row3Col2 && (row1Col2 === 'X' || row1Col2 === 'O'))
    {
      return true;
    }
    else if(row1Col3 === row2Col3 && row2Col3 === row3Col3 && (row1Col3 === 'X' || row1Col3 === 'O'))
    {
      return true;
    }
    else if(row1Col1 === row2Col2 && row2Col2 === row3Col3 && (row1Col1 === 'X' || row1Col1 === 'O'))
    {
      return true;
    }
    else if(row1Col3 === row2Col2 && row2Col2 === row3Col1 &&  (row1Col3 === 'X' || row1Col3 === 'O'))
    {
      return true;
    }
    return false;
}
    //Game Class Definition



    var getRoomId = function(){
        return this.roomId;
    }

    Game.prototype.displayBoard = function(message){
        $('.menu').css('display', 'none');
        $('.stats').css('display', 'none');
        $('.gameBoard').css('display', 'block');
        $('#userHello').html(message);
        //this.createGameBoard();
    }


    Game.prototype.updateBoard = function(type, row, col, tile){
        $('#'+tile).text(type);
        $('#'+tile).prop('disabled', true);
        //this.board[row][col] = type;
        //this.moves ++;
    }

    Game.prototype.playTurn = function(tile){
        var clickedTile = $(tile).attr('id');
        var turnObj = {
            tile: clickedTile,
            room: this.getRoomId()
        };
        // Emit an event to update other player that you've played your turn.
        socket.emit('playTurn', turnObj);
    }

    Game.prototype.endGame = function(message){
        alert(message);
        location.reload();
    }

    Game.prototype.checkWinner = function(){
        var currentPlayerPositions = player.getPlaysArr();
        Player.wins.forEach(function(winningPosition){
            if(winningPosition & currentPlayerPositions == winningPosition){
                game.announceWinner();
            }
        });

        var tied = this.checkTie();
        if(tied){
            socket.emit('gameEnded', {room: this.getRoomId(), message: 'Game Tied :('});
            alert('Game Tied :(');
            location.reload();
        }
    }

    Game.prototype.checkTie = function(){
        return this.moves >= 9;
    }

    Game.prototype.announceWinner = function(){
        var message = player.getPlayerName() + ' wins!';
        socket.emit('gameEnded', {room: this.getRoomId(), message: message});
        alert(message);
        location.reload();
    }



    //Player.wins = [7, 56, 448, 73, 146, 292, 273, 84];

    Player.prototype.updatePlaysArr = function(tileValue){
        this.playsArr += tileValue;
    }

    Player.prototype.getPlaysArr = function(tileValue){
        return this.playsArr;
    }

    Player.prototype.setCurrentTurn = function(turn){
        this.currentTurn = turn;
        if(turn)
            $('#turn').text('Your turn.');
        else
            $('#turn').text("Waiting for your Opponent's turn");
    }

    Player.prototype.getPlayerType = function(){
        return this.type;
    }

    Player.prototype.getPlayerName = function(){
        return this.name;
    }



    Player.prototype.getCurrentTurn = function(){
        return this.currentTurn;
    }
