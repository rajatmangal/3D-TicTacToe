var socket = io.connect('http://localhost:3000');


var Player = function(name, type){
    this.name = name;
    this.type = type;
    this.currentTurn = true;
    this.playsArr = 0;
}

var Game = function(roomId){
    this.roomId = roomId;
    this.board = [];
    this.moves = 0;
}

var PlayerOne = 'X', PlayerTwo = 'O';
var player;
var game;


$('#new').on('click', function(){
    var name = $('#nameNew').val();
    if(!name){
        alert('Please enter your name.');
        return;
    }
    socket.emit('startNewGame', {name: name});
    player = new Player(name, PlayerOne);
});

$('#join').on('click', function(){
    var name = $('#nameJoin').val();
    roomID = $('#room').val();
    if(!name || !roomID){
        alert('Please enter your name and game ID.');
        return;
    }
    socket.emit('joinExistingGame', {
      name: name,
      room: roomID
    });
    player = new Player(name, PlayerTwo);
});

socket.on('newGame', function(data){

    var message = 'Hello, ' + data.name +
        '. Please ask your friend to enter Game ID: ' +
        data.room + '. Waiting for player 2...';

    // Create game for player 1
    game = new Game(data.room);
    $('.menu').css('display', 'none');
    $('.gameBoard').css('display', 'block');
    $('#userHello').html(message);
    //game.displayBoard(message);
});

//If player creates the game, He is the the host
socket.on('player1', function(data){
    var message = 'Hello, ' + player.getPlayerName();

    // Reset the message for the player
    $('#userHello').html(message);

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
    var row = data.tile.split('_')[1][0];
    var col = data.tile.split('_')[1][1];
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

for(var i=0; i<3; i++) {
  for(var j=0; j<3; j++) {
    for(var k=0; k<3; k++) {
      $('#button_' + i + '' + j + '' + k).on('click', function(){
        if(!player.currentTurn){
            alert('Its not your turn!');
            return;
        }
        if($(this).prop('disabled')){
            alert('This tile has already been played on!');
        }
        var clickedTile = $(this).attr('id');
        var turnObj = {
            tile: clickedTile,
            room: game.roomId
        };
        socket.emit('playTurn', turnObj);
        $('#'+this.id).text(player.type);
        $('#'+this.id).prop('disabled', true);
        player.setCurrentTurn(false);
        //game.checkWinner();
        //this.board[row][col] = type;
        //this.moves ++;
      })
    }
  }
}

    //Game Class Definition



    var getRoomId = function(){
        return this.roomId;
    }

    Game.prototype.displayBoard = function(message){
        $('.menu').css('display', 'none');
        $('.gameBoard').css('display', 'block');
        $('#userHello').html(message);
        //this.createGameBoard();
    }

    // Game.prototype.createGameBoard = function(){
    //     for(var i=0; i<3; i++) {
    //         this.board.push(['','','']);
    //         for(var j=0; j<3; j++) {
    //             $('#button_' + i + '' + j).on('click', function(){
    //
    //                 //Check for turn
    //                 if(!player.getCurrentTurn()){
    //                     alert('Its not your turn!');
    //                     return;
    //                 }
    //
    //                 //Error on playing same button again.
    //                 if($(this).prop('disabled')){
    //                     alert('This tile has already been played on!');
    //                 }
    //
    //                 //Update board after your turn.
    //                 var row = parseInt(this.id.split('_')[1][0]);
    //                 var col = parseInt(this.id.split('_')[1][1]);
    //                 game.playTurn(this);
    //                 game.updateBoard(player.getPlayerType(), row, col, this.id);
    //
    //                 player.setCurrentTurn(false);
    //                 player.updatePlaysArr(1 << (row * 3 + col));
    //
    //                 game.checkWinner();
    //
    //                 return false;
    //             });
    //         }
    //     }
    // }

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



    Player.wins = [7, 56, 448, 73, 146, 292, 273, 84];

    Player.prototype.updatePlaysArr = function(tileValue){
        this.playsArr += tileValue;
    }

    Player.prototype.getPlaysArr = function(tileValue){
        return this.playsArr;
    }

    Player.prototype.setCurrentTurn = function(turn){
        this.currentTurn = turn;
        console.log("I am working");
        if(turn)
            $('#turn').text('Your turn.');
        else
            $('#turn').text('Waiting for Opponent');
    }

    Player.prototype.getPlayerName = function(){
        return this.name;
    }

    Player.prototype.getPlayerType = function(){
        return this.type;
    }

    Player.prototype.getCurrentTurn = function(){
        return this.currentTurn;
    }
