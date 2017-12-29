/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var app = function() {

    var self = {};
    self.is_configured = false;

    var server_url = "https://luca-ucsc-teaching-backend.appspot.com/keystore/";
    var call_interval = 2000;

    Vue.config.silent = false; // show all warnings

    // Extends an array
    self.extend = function(a, b) {
        for (var i = 0; i < b.length; i++) {
            a.push(b[i]);
        }
    };

    self.my_identity = randomString(20);

    var magic_word_addition = "nphw6";

    var turn_counter = 0;

    var game_counter = 0;

    var times_hit = 0;

    var three_ship = 0;

    var old_word = "";

    var other_players_hits = 0;

    self.null_board = setBoard();

    self.null_shoot_board = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    self.null_board_test = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    // Enumerates an array.
    var enumerate = function(v) {
        var k=0;
        v.map(function(e) {e._idx = k++;});
    };

    // Initializes an attribute of an array of objects.
    var set_array_attribute = function (v, attr, x) {
        v.map(function (e) {e[attr] = x;});
    };

    self.initialize = function () {
        document.addEventListener('deviceready', self.ondeviceready, false);
    };

    self.ondeviceready = function () {
        // This callback is called once Cordova has finished its own initialization.
        console.log("The device is ready");

        $("#vue-div").show();
        self.is_configured = true;
    };

    // This is the object that contains the information coming from the server.
    self.player1 = null;
    self.player2 = null;

    // This is the main control loop.
    function call_server() {
        console.log("Calling the server");
        if (self.vue.chosen_magic_word === null) {
            console.log("No magic word.");
            setTimeout(call_server, call_interval);
        } else {
            // We can do a server call.
            $.ajax({
                dataType: 'json',
                url: server_url +'read',
                data: {key: self.vue.chosen_magic_word},
                success: self.process_server_data,
                complete: setTimeout(call_server, call_interval) // Here we go again.
            });

        }
    }

    // Main function for sending the state.
    self.send_state1 = function () {
        $.post(server_url + 'store',
            {
                key: self.vue.chosen_magic_word,
                val: JSON.stringify(
                    {
                        'player1': self.player1,
                        'player2': self.player2,
                        'board1': self.vue.my_board,
                        'shoot1': self.vue.shoot_board,
                        'turn_counter': turn_counter,
                        'game_counter': game_counter,
                        'times_hit_player1': times_hit

                    }
                )
            }
        );
    };

    self.send_state2 = function () {
        $.post(server_url + 'store',
            {
                key: self.vue.chosen_magic_word,
                val: JSON.stringify(
                    {
                        'player1': self.player1,
                        'player2': self.player2,
                        'board2': self.vue.my_board,
                        'shoot2': self.vue.shoot_board,
                        'turn_counter': turn_counter,
                        'game_counter': game_counter,
                        'times_hit_player2': times_hit
                    }
                )
            }
        );
    };


    // Main place where we receive data and act on it.
    self.process_server_data = function (data) {
        // If data is null, we send our data.
        if (!data.result) {
            self.player1 = self.my_identity;
            self.player2 = null;
           // self.vue.my_board = self.null_board;
            // self.vue.shoot_board = self.null_shoot_board;
            self.vue.is_my_turn = false;
            self.send_state1();
        } else {
            // I technically don't need to assign this to self, but it helps debug the code.
            var server_answer = JSON.parse(data.result);
            console.log(server_answer);
            self.player1 = server_answer.player1;
            self.player2 = server_answer.player2;
            if (self.player1 === null || self.player2 === null) {
                // Some player is missing. We cannot play yet.
                self.vue.is_my_turn = false;
                self.vue.are_both_present = false;
                console.log("Not all players present.");
                if (self.player2 === self.my_identity || self.player1 === self.my_identity) {
                    // We are already present, nothing to do.
                    self.vue.are_both_present = false;
                    self.vue.waiting = true;
                    console.log("Waiting for other player to join");
                } else {
                    console.log("Signing up now.");
                    // We are not present.  Let's join if we can.
                    if (self.player1 === null) {
                        // Preferentially we play as x.
                        self.player1 = self.my_identity;
                        self.vue.shoot_board = server_answer.board2;
                        self.send_state1();
                    } else if (self.player2 === null) {
                        console.log("You are player 2");
                        self.player2 = self.my_identity;
                        self.vue.shoot_board = server_answer.board1;
                        self.send_state2();
                    } else {
                        // The magic word is already taken.
                        self.vue.need_new_magic_word = true;
                    }
                }
            } else {
                // Both players are present.
                // Let us determine our role if any.
                if (self.player2 !== self.my_identity && self.player1 !== self.my_identity) {
                    // Again, we are intruding in a game.
                    self.vue.intruding = true;
                    self.vue.need_new_magic_word = true;
                } else {
                    self.vue.intruding = false;
                    self.vue.waiting = false;
                    self.vue.are_both_present = true;
                    // Here is the interesting code: we are playing, and the opponent is there.
                    // Reconciles the state.
                    self.update_local_vars(server_answer);
                }
            }
        }
    };

    self.update_local_vars = function (server_answer) {
        // First, figures out our role.
        if (server_answer.player2 === self.my_identity) {
            self.vue.my_role = '2';
        } else if (server_answer.player1 === self.my_identity) {
            self.vue.my_role = '1';
        } else {
            self.vue.my_role = ' ';
        }

        // Reconciles the board, and computes whose turn it is.


        if(self.vue.my_role === '1' && server_answer){
            if(game_counter < server_answer.game_counter){
                // A new game has started
                self.vue.my_board = setBoard();
                console.log("reset board since new game is detected");
                game_counter = server_answer.game_counter;
                turn_counter = server_answer.turn_counter;
                if(!server_answer.board2 || server_answer.board2 === self.null_board_test){
                    console.log("No response from player 2, its cause you lost");
                } else if(server_answer.board2 !== self.null_board_test){
                    for(var i = 0; i < 64; i++) {
                        Vue.set(self.vue.shoot_board, i, server_answer.board2[i]);
                    }
                }
                self.vue.won = false;
                self.vue.lost = false;
                times_hit = 0;
                other_players_hits = 0;
                three_ship = 0;
                self.vue.is_my_turn = true;
                return;
            } else if(server_answer.turn_counter === turn_counter + 1 || (server_answer.turn_counter === 0) && (server_answer)) {
                // Update the board for player 1
                //self.vue.shoot_board = server_answer.board2;
                //self.vue.my_board = server_answer.shoot2;
                if((server_answer.board2 !== self.null_board_test) && (server_answer.shoot2 !== self.null_board_test)){
                    if(!server_answer.board2 || !server_answer){
                        console.log("yeet");
                        turn_counter = server_answer.turn_counter;
                        other_players_hits = server_answer.times_hit_player2;
                        self.did_you_win(other_players_hits);
                    } else {
                        turn_counter = server_answer.turn_counter;
                        for(var i = 0; i < 64; i++) {
                            if((self.vue.shoot_board[i] >= 0 && self.vue.shoot_board[i] < 4) || server_answer.board2[i] !== 0){
                                Vue.set(self.vue.shoot_board, i, server_answer.board2[i]);
                            } else if(self.vue.shoot_board[i] !== server_answer.board2[i] && self.vue.shoot_board[i] !== 0 && server_answer.board2[i] !== 0){
                                console.log("There is a board inconsistency at: " + i);
                            }
                        }

                        for(var i = 0; i < 64; i++) {
                            Vue.set(self.vue.my_board, i, server_answer.shoot2[i]);
                        }
                        other_players_hits = server_answer.times_hit_player2;
                        self.did_you_win(other_players_hits);
                    }
                            
                        //Vue.set(self.vue.my_board, server_answer.play_i2*8 + server_answer.play_j2, server_answer.hit);
                } 
            }
        } else if(self.vue.my_role === '2' && server_answer){
            if(game_counter < server_answer.game_counter){
                // A new game has started
                self.vue.my_board = setBoard();
                console.log("reset board since new game is detected");
                game_counter = server_answer.game_counter;
                turn_counter = server_answer.turn_counter;
                if(!server_answer.board1 || server_answer.board1 === self.null_board_test) {
                    //Don't set shoot to anything
                    console.log("No response from player 1");
                } else if (server_answer.board1 !== self.null_board_test) { 
                    for(var i = 0; i < 64; i++) {
                        Vue.set(self.vue.shoot_board, i, server_answer.board1[i]);
                    }
                }
                self.vue.is_my_turn = true;
                self.vue.won = false;
                self.vue.lost = false;
                times_hit = 0;
                other_players_hits = 0;
                three_ship = 0;
                return;
            } else if(server_answer.turn_counter === turn_counter + 1) {
                // Update the board for player 2
                //self.vue.shoot_board = server_answer.board1;
                //self.vue.my_board = server_answer.shoot1;
               // self.vue.shoot_board = server_answer.board1;
                if((server_answer.board1 !== self.null_board_test) && (server_answer.shoot1 !== self.null_board_test)){
                    for(var i = 0; i < 64; i++) {
                            if((self.vue.shoot_board[i] >= 0 && self.vue.shoot_board[i] < 4)|| server_answer.board1[i] !== 0){
                                Vue.set(self.vue.shoot_board, i, server_answer.board1[i]);
                            } else if(self.vue.shoot_board[i] !== server_answer.board1[i] && self.vue.shoot_board[i] !== 0 && server_answer.board1[i] !== 0){
                                console.log("There is a board inconsistency at: " + i);
                            }
                        }
                    turn_counter = server_answer.turn_counter;
                    for(var i = 0; i < 64; i++) {
                        Vue.set(self.vue.my_board, i, server_answer.shoot1[i]);
                    }
                    other_players_hits = server_answer.times_hit_player1;
                    self.did_you_win(other_players_hits);
                    //Vue.set(self.vue.my_board, server_answer.play_i1*8 + server_answer.play_j1, server_answer.hit);
                } 
            }
        }

        // Compute whether it's my turn on the basis of the now reconciled board.
        console.log("Whose turn?: " + whose_turn());
        if (self.is_game_finished()){
            self.vue.is_my_turn = false;
        } else {
            self.vue.is_my_turn = (self.vue.shoot_board !== null) &&
                (self.vue.my_role === whose_turn());
        }
    };

    function whose_turn() {
        if(turn_counter % 2 === 0) {
            return '1';
        } else {
            return '2';
        }
    }

    // Figure out how to start the new game, reconcile board changes and make sure no data gets fucked up
    self.newGame = function() {
        if(self.is_game_finished()){
            console.log("There was a new game requested. Reset game");
            game_counter++;
            self.vue.won = false;
            self.vue.shoot_board = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
                                    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            self.vue.my_board = setBoard();
            console.log("Game is finished, new board is initilized");
            times_hit = 0;
            other_players_hits = 0;
            three_ship = 0;
            if(self.vue.my_role === '1'){
                console.log("Sending new game to other player");
                if(self.vue.lost){
                    turn_counter++;
                    self.vue.lost = false;
                }
                self.send_state1();
            } else if(self.vue.my_role === '2'){
                if(self.vue.lost){
                    turn_counter++;
                    self.vue.lost = false;
                }
                self.send_state2();
            } 
        } else {
            return;
        }
    };

    self.is_game_finished = function() {
        if(times_hit === 10 || other_players_hits === 10){
            console.log("Game is finished");
            document.getElementById("ngb").disabled = false;
            return true;
        } else {
            document.getElementById("ngb").disabled = true;
            return false;
        }
    };

    self.did_you_win = function(other_players_hits) {
        if(self.is_game_finished()){
            if(self.vue.my_role === '1') {
                if(times_hit === 10){
                    self.vue.won = true;
                    console.log("Player 1 won");
                    self.vue.is_my_turn = false;
                    self.send_state1();
                    return;
                } else if(other_players_hits === 10){
                    console.log("Player 1 lost");
                    self.vue.lost = true;
                    return;
                }
            } else if(self.vue.my_role === '2'){
                if(times_hit === 10){
                    self.vue.won = true;
                    console.log("Player 2 won");
                    self.vue.is_my_turn = false;
                    self.send_state2();
                    return;
                } else if(other_players_hits === 10){
                    console.log("Player 2 lost");
                    self.vue.lost = true;
                    return;
                }
            } else {
                return;
            }
        }   
    };

    self.set_magic_word = function () {
        if(self.vue.magic_word !== old_word){
            self.vue.is_new_word = true;
        }
        if(self.vue.is_new_word) {
            self.vue.chosen_magic_word = magic_word_addition + self.vue.magic_word;
            old_word = self.vue.magic_word;
            console.log("Magic word: " + self.vue.chosen_magic_word);
            self.vue.need_new_magic_word = false;
            // Resets board and turn.
            self.vue.my_board = setBoard();
            console.log("We have set the magic word");
            self.vue.shoot_board = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
                                       0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            self.vue.is_my_turn = false;
            turn_counter = 0;
            times_hit = 0;
            self.vue.my_role = "";
            self.vue.is_new_word = false;
            other_players_hits = 0;
            three_ship = 0;
        }
    };


    self.shoot = function (i, j) {
        var index = i * 8 + j;
        console.log("Call to self.shoot");
        // Check that the game is ongoing and that it's our turn to play.
        if (!self.vue.is_my_turn && !self.vue.won && !self.vue.lost) {
            console.log("Its not my turn");
            return;
        }
        // Check also that the square is empty.
        if (self.vue.shoot_board[index] !== 0 && self.vue.shoot_board[index] !== 3 && self.vue.shoot_board[index] !== 2 && self.vue.shoot_board[index] !== 1) {
            console.log("Square is occupied");
            return;
        }
        //Update shoot_board
        if(self.vue.shoot_board[index] === 1 || self.vue.shoot_board[index] === 2 || self.vue.shoot_board[index] === 3){
            if(self.vue.shoot_board[index] === 3){
                three_ship++;
            }
            /*if(isSunk(self.vue.shoot_board[index], i, j)){

            }*/
            // The player hit a ship!
            Vue.set(self.vue.shoot_board, index, self.vue.shoot_board[index] * -1);
            console.log("Set shoot_board[" + (i*8 + j) + "] to red");
            isSunk(self.vue.shoot_board[index], i, j);
            if(!self.vue.won && !self.vue.lost){
                console.log("Game is not over, we are changing counter and times hit");
                turn_counter++;
                times_hit++;
            }
            
            if(times_hit===10 && !self.vue.won && !self.vue.lost){
                // Checking to see if the game is over
                self.did_you_win(other_players_hits);
                return;
            }
            console.log(times_hit);
        } else {
            // Missed :(
            Vue.set(self.vue.shoot_board, i*8 + j, 4);
            console.log("Set shoot_board[" + (i*8 + j) + "] to blue");
            if(!self.vue.won && !self.vue.lost){
                console.log("Game is not over, we are changing counter");
                turn_counter++;
            }

        }
        console.log("Last shoot at: " + i + ", " + j);
        self.vue.is_my_turn = false;
        if(self.player1 === self.my_identity){
            self.send_state1();
        } else {
            self.send_state2();
        }

    };      

    //Implement isSunk   

    function isSunk(color, i, j){
        if(color === -1) {
            if(i*8 + (j + 1) < 64 && self.vue.shoot_board[i*8 + (j + 1)] === 0 && (i*8 + (j + 1)) % 8 !== 0){
                Vue.set(self.vue.shoot_board, i*8 + j+1, 4);
            }
            if(i*8 + (j - 1) >= 0 && self.vue.shoot_board[i*8 + (j - 1)] === 0 && (i*8 + (j - 1)) % 8 !== 7){
                Vue.set(self.vue.shoot_board, i*8 + j-1, 4);
            }
            if((i - 1)*8 + j >= 0 && self.vue.shoot_board[(i-1)*8 + j] === 0){
                Vue.set(self.vue.shoot_board, (i-1)*8 + j, 4);
            }
            if((i + 1)*8 + j < 64 && self.vue.shoot_board[(i+1)*8 + j] === 0){
                Vue.set(self.vue.shoot_board, (i+1)*8 + j, 4);
            }
            return;
        
        } else if (color === -3 && three_ship % 3 === 0) {
            if(((self.vue.shoot_board[i*8 + j - 1]) !== -3 && (self.vue.shoot_board[i*8 + j + 1]) !== -3) 
                && ((self.vue.shoot_board[i*8 + j - 1]) !== 3 && (self.vue.shoot_board[i*8 + j + 1]) !== 3)){  
                // The ship is positioned vertically
                while(((i-1)*8 + j) >= 0 && self.vue.shoot_board[(i-1)*8 + j] % 4 !== 0 && ((i-1)*8 + j) % 8 !== 7){
                    i--;
                    console.log(i);
                }
                var start;
                var end = i + 3;
                for(start = i; start < end; start++){
                    if(start*8 + (j + 1) < 64 && self.vue.shoot_board[start*8 + (j + 1)] === 0 && (start*8 + (j + 1)) % 8 !== 0){
                        Vue.set(self.vue.shoot_board, start*8 + j+1, 4);
                    }
                    if(start*8 + (j - 1) >= 0 && self.vue.shoot_board[start*8 + (j - 1)] === 0 && (start*8 + (j - 1)) % 8 !== 7){
                        Vue.set(self.vue.shoot_board, start*8 + j-1, 4);
                    }
                    if((start - 1)*8 + j >= 0 && self.vue.shoot_board[(start-1)*8 + j] === 0){
                        Vue.set(self.vue.shoot_board, (start-1)*8 + j, 4);
                    }
                    if((start + 1)*8 + j >= 0 && self.vue.shoot_board[(start+1)*8 + j] === 0){
                        Vue.set(self.vue.shoot_board, (start+1)*8 + j, 4);
                    }
                }
            } else {
                // The ship is horizontal
                while((i*8 + j - 1) >= 0 && self.vue.shoot_board[i*8 + j - 1] % 4 !== 0 && (i*8 + j-1) % 8 !== 7){
                    j--;
                }
                var start;
                var end = j + 3;
                for(start = j; start < end; start++){
                    if(i*8 + (start + 1) < 64 && self.vue.shoot_board[i*8 + (start + 1)] === 0 && (i*8 + (start + 1)) % 8 !== 0){
                        Vue.set(self.vue.shoot_board, i*8 + start+1, 4);
                    }
                    if(i*8 + (start - 1) >= 0 && self.vue.shoot_board[i*8 + (start - 1)] === 0 && (i*8 + (start - 1)) % 8 !== 7){
                        Vue.set(self.vue.shoot_board, i*8 + start-1, 4);
                    }
                    if((i - 1)*8 + start >= 0 && self.vue.shoot_board[(i-1)*8 + start] === 0){
                        Vue.set(self.vue.shoot_board, (i-1)*8 + start, 4);
                    }
                    if((i + 1)*8 + start >= 0 && self.vue.shoot_board[(i+1)*8 + start] === 0){
                        Vue.set(self.vue.shoot_board, (i+1)*8 + start, 4);
                    }
                }
            }
            return;
        } else if(color === -2){
            if((i*8 + j - 1 >= 0 && self.vue.shoot_board[i*8 + j -1] === -2 && (i*8 + j - 1) % 8 !== 7 ) 
                    || (i*8 + j + 1 < 64 && self.vue.shoot_board[i*8 + j + 1] === -2 && i*8 + j + 1) % 8 !== 0){
                // The ship is horizontal
                while((i*8 + j - 1) >= 0 && self.vue.shoot_board[i*8 + j - 1] % 4 !== 0 && (i*8 + j-1) % 8 !== 7){
                    j--;
                }
                var start;
                var end = j + 2;
                for(start = j; start < end; start++){
                    if(i*8 + (start + 1) < 64 && self.vue.shoot_board[i*8 + (start + 1)] === 0 && (i*8 + (start + 1)) % 8 !== 0){
                        Vue.set(self.vue.shoot_board, i*8 + start+1, 4);
                    }
                    if(i*8 + (start - 1) >= 0 && self.vue.shoot_board[i*8 + (start - 1)] === 0 && (i*8 + (start - 1)) % 8 !== 7){
                        Vue.set(self.vue.shoot_board, i*8 + start-1, 4);
                    }
                    if((i - 1)*8 + start >= 0 && self.vue.shoot_board[(i-1)*8 + start] === 0){
                        Vue.set(self.vue.shoot_board, (i-1)*8 + start, 4);
                    }
                    if((i + 1)*8 + start >= 0 && self.vue.shoot_board[(i+1)*8 + start] === 0){
                        Vue.set(self.vue.shoot_board, (i+1)*8 + start, 4);
                    }
                }
            } else if(((i-1)*8 + j >= 0 && self.vue.shoot_board[(i-1)*8 + j] === -2) || (i+1)*8 + j < 64 && self.vue.shoot_board[(i+1)*8 + j] === -2){
                // The ship is vertical
                console.log("The ship is vertical");
                while(((i-1)*8 + j) >= 0 && self.vue.shoot_board[(i-1)*8 + j] % 4 !== 0){
                    i--;

                }
                console.log("Start pos: " + i);
                var start;
                var end = i + 2;
                for(start = i; start < end; start++){
                    if(start*8 + (j + 1) < 64 && self.vue.shoot_board[start*8 + (j + 1)] === 0 && (start*8 + (j + 1)) % 8 !== 0){
                        Vue.set(self.vue.shoot_board, start*8 + j+1, 4);
                    }
                    if(start*8 + (j - 1) >= 0 && self.vue.shoot_board[start*8 + (j - 1)] === 0 && (start*8 + (j - 1)) % 8 !== 7){
                        Vue.set(self.vue.shoot_board, start*8 + j-1, 4);
                    }
                    if((start - 1)*8 + j >= 0 && self.vue.shoot_board[(start-1)*8 + j] === 0){
                        Vue.set(self.vue.shoot_board, (start-1)*8 + j, 4);
                    }
                    if((start + 1)*8 + j >= 0 && self.vue.shoot_board[(start+1)*8 + j] === 0){
                        Vue.set(self.vue.shoot_board, (start+1)*8 + j, 4);
                    }
                }
            }
            return;
        }
        return;
    }


    //checks for valid placement of ship of ship_size in a board_size x board_size at (x,y) with orientatation (0->horizontal, 1-> vertical)
    function isvalid(board, x, y, orientation, ship_size, board_size){
        if(orientation){
            if(x+ship_size >= board_size) return false;
            for(var i = x; i < x+ship_size; i++){
                if(board[i][y] !== 0 || 
                    (y-1 >= 0 && board[i][y-1] !== 0) || // to ensure that ships do not "touch each other"
                    (y+1 < board_size && board[i][y+1] !== 0)) 
                        return false;
            }
            if((x - 1 >= 0 && board[x-1][y] !== 0) || 
                (x + ship_size < board_size && board[x+ship_size][y] !== 0)) return false;
        } else {
            if(y+ship_size >= board_size) return false;
            for(var i = y; i < y+ship_size; i++){
                if(board[x][i] !== 0 || 
                    (x-1 >= 0 && board[x-1][i] !== 0) || // to ensure that ships do not "touch each other"
                    (x+1 < board_size && board[x+1][i] !== 0)) 
                        return false;
            }
            if((y-1 >= 0 && board[x][y-1] !== 0) || 
                (y+ship_size < board_size && board[x][y+ship_size] !== 0)) return false;
        }
        return true;
    }

    function print(board){
        var size = Math.sqrt(board.length);
        for(var i = 0; i < size; i++){
            var s = "";
            for(var j = 0; j < size; j++){
                s += board[i*size + j];
            }
            console.log(s);
        }
    }

    //creates a ship in board with shipid
    function setShip(board, orientation, x, y, ship_size, shipid){
        if(orientation){
            for(var i = x; i < x+ship_size; i++){
                board[i][y] = shipid;
            }
        }else{
            for(var i = y; i < y+ship_size; i++){
                board[x][i] = shipid;
            }
        }
    }

    //get random integers in range [Min, Max]
    function get_random(Min, Max){
        return Math.floor(Math.random() * (Max - Min +1)) + Min;
    }

    //create a ship
    function createShip(board, board_size, ship_size, shipid){
        var counter=0;
        while(counter < 200){
            counter++;
            var orientation = get_random(0, 1);//0 -> horizontal, 1-> vertical
            var x=0;
            var y=0;
            if(orientation){
                x = get_random(0, board_size-ship_size-1);
                y = get_random(0, board_size-1);
            }else{
                x = get_random(0, board_size-1);
                y = get_random(0, board_size-ship_size-1);
            }
            if(!isvalid(board, x, y, orientation, ship_size, board_size)) continue; //check if it conflicts
            setShip(board, orientation, x, y, ship_size, shipid);
            break;
        }
    }

    //create all ships
    function createShips(board, board_size){
        var ships = [[1,3], [3,1], [2,2]]; // first element of every pair is number of ships, second element is length of ship
        var total_ships = 1;
        var shipid = 3;
        for(var i = 0; i < ships.length; i++){
            for(var count = 0; count < ships[i][0]; count++){
                createShip(board, board_size, ships[i][1], shipid);
                total_ships++;
                if(total_ships >=2 && total_ships < 5){
                    shipid = 1;
                } else if(total_ships === 5 || total_ships === 6) {
                    shipid = 2;
                }
            }
        }
    }
    //flatten 2d vector to 1d vector
    function flatten(board){
        var size = board.length;
        var board2 = new Array(size*size);
        for(var i = 0; i < size; i++){
            for(var j = 0; j < size; j++)
                board2[i*size + j] = board[i][j];
        }
        return board2;
    }

    // get 8x8 board flattened
    function setBoard(){
        var size = 8;
        var board = new Array(size);
        for (var i = 0; i < size; i++) {
            board[i] = new Array(size);
            for (var j = 0; j < size; j++)
                board[i][j] = 0;
        }
        createShips(board, size);
        board = flatten(board);
        console.log("initial board set");
        return board;
    }


    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            magic_word: "",
            chosen_magic_word: null,
            need_new_magic_word: false,
            won: false,
            lost: false,
            my_role: "",
            shoot_board: self.null_shoot_board,
            my_board: self.null_shoot_board,
            is_other_present: false,
            is_my_turn: false,
            are_both_present: false,
            waiting: false,
            is_new_word: false,
            intruding: false
        },
        methods: {
            set_magic_word: self.set_magic_word,
            shoot: self.shoot,
            newGame: self.newGame
        }

    });

    call_server();

    return self;
};

var APP = null;

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){
    APP = app();
    APP.initialize();
});