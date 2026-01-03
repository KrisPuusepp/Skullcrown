const express = require('express');
const { pid } = require('process');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

app.use('/', express.static(__dirname + '/'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client.html');
});

process.on('SIGTERM', () => {
    app.close(() => {
        console.log('Process terminated')
    })
})










        // For future readers:
        // 1: When working on a player related function, change argument from player to id for consistency. too lazy to do it rn xd
        // 2: Common cause for Socket.io problems - everything is a string, even ints are transmitted as strings
        // 3: There is a lot of duplicate code, like when we are shuffling cards. Please fix and use functions.






















// Players will have IDs because thats the simplest way to handle dc's/joins
// @@@ !!! - The play order will be from smallest to biggest
var players = {};
var freePlayerID = 0;

// Game Settings
var gameInfo = {
    playing: false,
    currentTurn: -1,
    state: "play", // play1st, play, addBid, pick, remove. Can also be "transition" in which case nothing should happen
    currentBid: -1,
    currentBidder: -1,
    spies: [],
    skullsToTake: 0,
    eligibleForPoint: true,
    havePassed: [],
    canPlayCard: [], // used only on 1st round, otherwise use play and currentTurn
}

var modeInfo = {
    mode: "Classic",
    pBGRWidth: 450,
    pBGRHeight: 250,
    myBGRWidth: 750,
    myBGRHeight: 350,
    cardHandScale: 1,
    myCardHandScale: 1.5,
    cardCount: 4,
    pointsToWin: 2,
    setSpy: false,
    keepGoingAfterSkull: false,
    losePointEligibilityAfter: "any", // any, other (card that isnt yours)
}
function hasPassed(id) {
    if(gameInfo.havePassed.indexOf(parseInt(id)) == -1) {
        return false;
    } else {
        return true;
    }
}

var turnOrder = [];
function nextTurn() {
    for(var i = 0; i < 100; i++) {
        gameInfo.currentTurn = turnOrder[ (turnOrder.indexOf(gameInfo.currentTurn)+1) % turnOrder.length];
        if(players.hasOwnProperty(gameInfo.currentTurn)) {
            var targetPlayer = players[gameInfo.currentTurn];
            if(!hasPassed(gameInfo.currentTurn) && targetPlayer.cards.length > 0) {
                return;
            }
        }
    }
}


function addPlayer(id) {
    var player = players[id] = {
        socket: null,

        name: "Player",
        color: "#FF0000",
        cards: [],
        points: 0,
    }
    return player;
}
// NOTE: Takes player as argument
function removeCard(id, index) {
    players[id].cards.splice(index, 1);
}
// NOTE: Takes ID not player
function removePlayer(id) {
    if(!players.hasOwnProperty(id)) return;
    if(gameInfo.playing && players[id].cards.length > 0) {
        nextRound(false);
        io.emit("updateGameInfo", gameInfo);
    }
    if(gameInfo.canPlayCard.indexOf(id) != -1) gameInfo.canPlayCard.splice(gameInfo.canPlayCard.indexOf(id), 1);
    delete players[id];
}
function getPlayedCards(id) {
    var amount = 0;
    var player = players[id];
    for(var i = 0; i < player.cards.length; i++) {
        if(player.cards[i].state == "played") amount++;
    }
    return amount;
}
function getAllPlayedCards() {
    var amount = 0;
    for(var id in players) {
        var player = players[id];
        for(var i = 0; i < player.cards.length; i++) {
            if(player.cards[i].state == "played") amount++;
        }
    }
    return amount;
}
function getPlayersWithCards() {
    var playersWithCards = 0;
    for(var pID in players) {
        if(players[pID].cards.length > 0) {
            playersWithCards++;
        }
    }
    return playersWithCards;
}

function checkForWin() {
    var hasWon = false;
    var playersWithCards = getPlayersWithCards();
    if(playersWithCards == 1) {
        hasWon = true;
    } else {
        for(var pID in players) {
            if(players[pID].points >= modeInfo.pointsToWin) {
                hasWon = true;
                break;
            }
        }
    }
    return hasWon;
}

function nextRound(givePoint = false, id = -1, index = -1) { // the last 2 are for a card to remove if playing without multiskull
    gameInfo.havePassed = [];

    gameInfo.state = "transition";

    // Immediately shuffle cards if a card is about to get removed, only delay to let people see if they have won when flipping card
    var firstDelay = 1000;
    if(id != -1) firstDelay = 0;
    setTimeout(() => {
        for(var pID in players) {
            let sendPacket = {id: pID};
            for(var i = 0; i < players[pID].cards.length; i++) {
                players[pID].cards[i].state = "shuffling";
                sendPacket[i] = {state: "shuffling"}
            }
            io.emit("updateCards", sendPacket);
        }
        gameInfo.state = "play1st";
        gameInfo.canPlayCard = [];
        gameInfo.currentBid = -1;
        gameInfo.currentBidder = -1;
        gameInfo.eligibleForPoint = true;
        gameInfo.skullsToTake = 0;
        io.emit("updateGameInfo", gameInfo);
        setTimeout(() => {
            if(id != -1 && index != -1) {
                removeCard(id, index);
                io.emit("removeCard", {id: id, index: index});
            }
            // Check for win, because now with the card removed
            // Someone might win by being the last player with cards
            var hasWon = checkForWin();
            if(hasWon) {
                gameInfo.playing = false;
                gameInfo.currentTurn = -1;
                io.emit("updateGameInfo", gameInfo);
                return;
            }
            if(givePoint != false) {
                players[gameInfo.currentTurn].points++;
                io.emit("updatePlayer", {id: gameInfo.currentTurn, points: players[gameInfo.currentTurn].points});
            }
            // Check for win again, this time for points
            hasWon = checkForWin();
            if(hasWon) {
                gameInfo.playing = false;
                gameInfo.currentTurn = -1;
                io.emit("updateGameInfo", gameInfo);
                return;
            }

            nextTurn();
            for(var pID in players) {
                if(players[pID].cards.length > 0)
                    gameInfo.canPlayCard.push(parseInt(pID));
            }
            io.emit("showTitle", players[gameInfo.currentTurn].name + " will start", 3000);
            io.emit("updateGameInfo", gameInfo);

            for(var pID in players) {
                let sendPacket = {id: pID};
                var orders = [];
                for(var i = 0; i < players[pID].cards.length; i++) {
                    orders[i] = i;
                }
                shuffleArray(orders);
                for(var i = 0; i < players[pID].cards.length; i++) {
                    players[pID].cards[i].state = "hand";
                    players[pID].cards[i].order = orders[i];
                    sendPacket[i] = {state: "hand", order: orders[i]}
                }
                io.emit("updateCards", sendPacket);
            }
        }, 1000);
    }, firstDelay);
}

// Thanks SOF: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}





        // NOTE: Most graphics are contained in a Player's Konva.Group, but Cards and Bid Numbers are not
        // @ = Synced with server
        // # = Server only
        //   = Client only
        /* Player instances: (accessed with ID)
            # socket = null
            @ name = "Player1"
            @ color = "#FF0000"
            @ cards = [{}, {}, {}, {}]
            @ points = 0
            position = {x:0,y:0} // used as a movable root
            graphicGroup = null
            backgroundGraphic = null
            textGraphic = null
            pointsGraphic = null
            // Graphics are made in setupPlayer()
        */
        /* Synced Card instances:
            @ type = "skull"
            @ state = "hand" || "played" || "revealed" || "shuffling"
            @ order = 0-x
            // Order is the order that the cards are in hand or when played
        */
        /* Possible packet types:
            @@@@@ Client -> Server
            "updatePlayer" (name, color)
            "pickCard"
            "betNumber" (-1 is pass)
            "setMode" (string, hasSpy) set the mode and specifies if there is a spy. Server sets and updates the variables itself.
            "startGame"
            "stopGame"
            "focusPlayer" (ID) forwarded to all other clients

            @ = Meant to be used as an admin/debug command.
            @ "setGameInfo" (gameInfo) sets game info.
            @ "setModeInfo" (gameInfo) sets game info.
            @ "forceNextRound" starts next round without points/card removals.
            @ "kickPlayer" (id) forces disconnect and instaremoves player.
            @ "setPoints" (id, points) sets player points. Doesnt check for game win.



            @@@@@ Server -> Client
            "firstTimeSetup" force refresh if client receives 2, it means the server restarted
            "updateModeInfo" {modeinfo}
            "updateGameInfo" {gameinfo}
            "setPlayerID" (set myPlayerID)
            "addPlayer" {id: 0} (name, color, points)
            "updateAllPlayers"
            "showTitle" (text)
            "updatePlayer" (name, color, points)
            "removePlayer" (index)
            "updateCards" (id, cards[]) // Only states and orders
            "removeCard" (index)
            "setCards" (id, cards[]) // Clears whole list and creates new graphics too
        */
io.on('connection', (socket) => {
    console.log("+ User connected, ID: " + socket.id);
    socket.emit("firstTimeSetup");

    var myPlayerID = -1;

    // Send all current players and cards
    for(var id in players) {
        socket.emit("addPlayer", {id: id, name: players[id].name, color: players[id].color, points: players[id].points});
        socket.emit("setCards", {id: id, cards: players[id].cards});
    }

    if(!gameInfo.playing) {
        // Check for free players
        for(var id in players) {
            if(players[id].socket == null) {
                myPlayerID = parseInt(id);
                players[id].socket = socket;
                socket.emit("setPlayerID", myPlayerID);
                break;
            }
        }

        // Create new player if there are none free
        if(myPlayerID == -1) {
            var newPl = addPlayer(freePlayerID);
            newPl.socket = socket;
            myPlayerID = parseInt(freePlayerID);
            freePlayerID++;
            io.emit("addPlayer", {id: myPlayerID, name: newPl.name, color: newPl.color, points: newPl.points});
            socket.emit("setPlayerID", myPlayerID);
        }

    } else {
        // Check for free players
        for(var id in players) {
            if(players[id].socket == null) {
                myPlayerID = parseInt(id);
                players[id].socket = socket;
                socket.emit("setPlayerID", myPlayerID);
                break;
            }
        }
    }
    // We need to send this before incase we want to send bidText
    io.emit("updateAllPlayers");
    // Send current modeInfo
    socket.emit("updateModeInfo", modeInfo);
    // Send current gameInfo
    socket.emit("updateGameInfo", gameInfo);










    /*socket.onAny((eventName, ...args) => {
        console.log(socket.id + ": " + eventName);
    });*/
    
    socket.on("updatePlayer", (data) => {
        if(myPlayerID == -1) return;
        if(data.hasOwnProperty("name")) players[myPlayerID].name = data.name;
        if(data.hasOwnProperty("color")) players[myPlayerID].color = data.color;
        // kinda hacky and unnecessary but works
        io.emit("updatePlayer", {id: myPlayerID, name: players[myPlayerID].name, color: players[myPlayerID].color});
    })

    socket.on("focusPlayer", (data) => {
        socket.broadcast.emit("focusPlayer", data);
    })

    socket.on("setMode", (data, setSpy) => {
        if(gameInfo.playing == true) return;
        if(data == "Classic") {
            modeInfo = {
                mode: "Classic",
                pBGRWidth: 450,
                pBGRHeight: 250,
                myBGRWidth: 750,
                myBGRHeight: 350,
                cardHandScale: 1,
                myCardHandScale: 1.5,
                cardCount: 4,
                pointsToWin: 2,
                setSpy: false,
                keepGoingAfterSkull: false,
                losePointEligibilityAfter: "any",
            }
        } else if(data == "Double Skull") {
            modeInfo = {
                mode: "Double Skull",
                pBGRWidth: 450,
                pBGRHeight: 250,
                myBGRWidth: 1350,
                myBGRHeight: 350,
                cardHandScale: 1,
                myCardHandScale: 1.5,
                cardCount: 8,
                pointsToWin: 3,
                setSpy: false,
                keepGoingAfterSkull: true,
                losePointEligibilityAfter: "other",
            }
        } else if(data == "Spy") {
            modeInfo = {
                mode: "Spy",
                pBGRWidth: 450,
                pBGRHeight: 250,
                myBGRWidth: 750,
                myBGRHeight: 350,
                cardHandScale: 1,
                myCardHandScale: 1.5,
                cardCount: 4,
                pointsToWin: 999,
                setSpy: true,
                keepGoingAfterSkull: false,
                losePointEligibilityAfter: "any",
            }
        }
        if(setSpy == true) modeInfo.setSpy = true;
        if(setSpy == false) modeInfo.setSpy = false;
        io.emit("showTitle", "Gamemode has been set to " + data, 3000);
        io.emit("updateModeInfo", modeInfo);
    });

    socket.on("startGame", () => {
        if(!gameInfo.playing && Object.keys(players).length >= 2) {
            //Generate cards
            for(let id in players) {
                let player = players[id];
                var orders = [];
                for(var i = 0; i < modeInfo.cardCount; i++) {
                    orders[i] = i;
                }
                shuffleArray(orders);
                player.cards = [];
                for(var i = 0; i < modeInfo.cardCount; i++) {
                    player.cards[i] = {
                        type: "crown",
                        state: "shuffling",
                        order: orders[i],
                    };
                }
                player.cards[0].type = "skull";
                if(modeInfo.mode == "Double Skull") player.cards[1].type = "skull";

                setTimeout(() => {
                    if(!players.hasOwnProperty(id) || players[id].cards.length == 0) return;
                    var sendPacket = {id: id};
                    for(var i = 0; i < player.cards.length; i++) {
                        player.cards[i].state = "hand";
                        sendPacket[i] = {state: "hand"};
                    }
                    io.emit("updateCards", sendPacket);
                }, 1000);

                // Points to 0
                player.points = 0;
                io.emit("updatePlayer", {id: id, points: 0});

                io.emit("setCards", {id: id, cards: player.cards});
            }
            
            //gameInfo
            gameInfo = {
                playing: true,
                currentTurn: -1,
                state: "play1st", // play1st, play, addBid, pick, remove. Can also be "transition" in which case nothing should happen
                currentBid: -1,
                currentBidder: -1,
                spies: [],
                skullsToTake: 0,
                eligibleForPoint: true,
                havePassed: [],
                canPlayCard: [], // used only on 1st round, otherwise use play and currentTurn
            }
            for(var pID in players) gameInfo.canPlayCard.push(parseInt(pID));
            // Pick random spy
            if(modeInfo.setSpy) {
                let playerToBeSpy = Object.keys(players)[Math.round(Math.random()*(Object.keys(players).length-1))];
                gameInfo.spies = [playerToBeSpy];
                setTimeout(() => {
                    players[playerToBeSpy].socket.emit("showTitle", "You are the Spy", 3000);
                }, 1000);
            }
            // Pick random player to start
            turnOrder = Object.keys(players);
            for(var i = 0; i < turnOrder.length; i++) {
                turnOrder[i] = parseInt(turnOrder[i], 10);
            }
            turnOrder.sort(function(a, b) {
                return a - b;
            });
            gameInfo.currentTurn = turnOrder[Math.round( Math.random()*(turnOrder.length-1) )];
            io.emit("showTitle", players[gameInfo.currentTurn].name + " will start", 3000);
            io.emit("updateGameInfo", gameInfo);
        }
    })
    socket.on("stopGame", () => {
        if(gameInfo.playing) {
            gameInfo.playing = false;
            for(var id in players) {
                for(var i = 0; i < players[id].cards.length; i++) {
                    io.emit("removeCard", {id: id, index: 0});
                }
                players[id].cards = [];
            }
            gameInfo.currentTurn = -1;
            gameInfo.spies = [];
            gameInfo.canPlayCard = [];
            gameInfo.havePassed = [];
            io.emit("updateGameInfo", gameInfo);
        }
    })

    socket.on("pickCard", (data) => {
        var id = parseInt(data.id, 10);
        var index = parseInt(data.index, 10);
        if(gameInfo.playing) {
            if(gameInfo.state == "play1st" && gameInfo.canPlayCard.indexOf(myPlayerID) != -1) {
                players[id].cards[index].state = "played";
                players[id].cards[index].order = getPlayedCards(id)-1;
                var sendPacket = {id: id};
                sendPacket[index] = {state: "played", order: getPlayedCards(id)-1}
                gameInfo.canPlayCard.splice(gameInfo.canPlayCard.indexOf(myPlayerID), 1);
                if(gameInfo.canPlayCard.length == 0) gameInfo.state = "play";
                io.emit("updateCards", sendPacket);
                io.emit("updateGameInfo", gameInfo); 
            } else if(gameInfo.currentTurn == myPlayerID) {
                if(gameInfo.state == "play") {
                    players[id].cards[index].state = "played";
                    players[id].cards[index].order = getPlayedCards(id)-1;
                    var sendPacket = {id: id};
                    sendPacket[index] = {state: "played", order: getPlayedCards(id)-1}
                    io.emit("updateCards", sendPacket);
    
                    nextTurn();
                    io.emit("updateGameInfo", gameInfo); 
                } else if(gameInfo.state == "pick") {
                    players[id].cards[index].state = "revealed";
                    if(players[id].cards[index].type == "skull") {
                        gameInfo.currentBid--;
                        gameInfo.skullsToTake++;
                        if(modeInfo.losePointEligibilityAfter == "any") {
                            gameInfo.eligibleForPoint = false;
                        } else if(modeInfo.losePointEligibilityAfter == "other") {
                            if(id != myPlayerID) gameInfo.eligibleForPoint = false;
                        }
                        if(!modeInfo.keepGoingAfterSkull) {
                            gameInfo.currentBid = 0;
                        }
                    } else {
                        gameInfo.currentBid--;
                    }
                    // check if bids done
                    if(gameInfo.currentBid == 0 && gameInfo.state == "pick") {
                        if(gameInfo.skullsToTake == 0) {
                            nextRound(gameInfo.eligibleForPoint);
                        } else {
                            gameInfo.state = "remove";
                            if(gameInfo.skullsToTake >= players[myPlayerID].cards.length) {
                                // remove all cards
                                gameInfo.state = "transition";
                                setTimeout(() => {
                                    nextRound();
                                }, 1000 + 200 * players[myPlayerID].cards.length);
                                for(var i = 0; i < players[myPlayerID].cards.length; i++) {
                                    setTimeout(() => {
                                        removeCard(myPlayerID, 0);
                                        gameInfo.skullsToTake--;
                                        io.emit("updateGameInfo", gameInfo);
                                        io.emit("removeCard", {id: myPlayerID, index: 0});
                                    }, 1000 + 200 * i);
                                }
                            }
                        }
                    }

                    let sendPacket = {id: id};
                    sendPacket[index] = {state: "revealed"}
                    io.emit("updateCards", sendPacket);
    
                    io.emit("updateGameInfo", gameInfo);
                } else if(gameInfo.state == "remove") {
                    gameInfo.skullsToTake--;
                    if(gameInfo.skullsToTake == 0) {
                        nextRound(gameInfo.eligibleForPoint, myPlayerID, index);
                    } else {
                        gameInfo.state = "transition";
                        let sendPacket = {id: myPlayerID};
                        // Send to hand
                        for(var i = 0; i < players[myPlayerID].cards.length; i++) {
                            players[myPlayerID].cards[i].state = "shuffling";
                            sendPacket[i] = {state: "shuffling"}
                        }
                        io.emit("updateCards", sendPacket);
                        setTimeout(() => {
                            // Remove
                            if(myPlayerID != -1 && index != -1) {
                                removeCard(myPlayerID, index);
                                io.emit("removeCard", {id: myPlayerID, index: index});
                            }
            
                            // Reshuffle and let player pick again
                            let sendPacket = {id: myPlayerID};
                            var orders = [];
                            for(var i = 0; i < players[myPlayerID].cards.length; i++) {
                                orders[i] = i;
                            }
                            shuffleArray(orders);
                            for(var i = 0; i < players[myPlayerID].cards.length; i++) {
                                players[myPlayerID].cards[i].state = "hand";
                                players[myPlayerID].cards[i].order = orders[i];
                                sendPacket[i] = {state: "hand", order: orders[i]}
                            }
                            io.emit("updateCards", sendPacket);
                            gameInfo.state = "remove";
                            io.emit("updateGameInfo", gameInfo);
                        }, 1000);
                    }
                    io.emit("updateGameInfo", gameInfo);
                }
            }
        }
    })
    socket.on("betNumber", (nr) => {
        if(gameInfo.playing) {
            if(nr != -1 && (gameInfo.currentBid > nr || nr > getAllPlayedCards())) return;

            gameInfo.state = "addBid";
            if(nr == -1) {
                gameInfo.havePassed.push(parseInt(myPlayerID));
            } else {
                gameInfo.currentBidder = myPlayerID;
                gameInfo.currentBid = nr;
            }
            if(gameInfo.currentBid == getAllPlayedCards()) {
                gameInfo.havePassed = [];
                gameInfo.state = "pick";
                io.emit("showTitle", players[gameInfo.currentBidder].name + " won the bidding with " + gameInfo.currentBid.toString(), 3000);
            } else {
                while(gameInfo.currentTurn == myPlayerID && getPlayersWithCards() > 1) {
                    nextTurn();
                }
                if(gameInfo.currentTurn == gameInfo.currentBidder) {
                    gameInfo.havePassed = [];
                    gameInfo.state = "pick";
                    io.emit("showTitle", players[gameInfo.currentBidder].name + " won the bidding with " + gameInfo.currentBid.toString(), 3000);
                }
            }
            io.emit("updateGameInfo", gameInfo);
        }
    })
    socket.on("setGameInfo", (data) => {
        for(var prop in data) gameInfo[prop] = data[prop];
        io.emit("updateGameInfo", gameInfo);
    })
    socket.on("setModeInfo", (data) => {
        for(var prop in data) modeInfo[prop] = data[prop];
        io.emit("updateModeInfo", modeInfo);
    })
    socket.on("forceNextRound", () => {
        nextRound(false);
        io.emit("updateGameInfo", gameInfo);
    })
    socket.on("kickPlayer", (id) => {
        id = parseInt(id);
        if(!players.hasOwnProperty(id)) return;
        players[id].socket.disconnect();
        removePlayer(id);
        io.emit("removePlayer", id)
    })
    socket.on("setPoints", (id, points) => {
        id = parseInt(id);
        points = parseInt(points);
        players[id].points = points;
        io.emit("updatePlayer", {id: id, points: points});
    })

    socket.on("disconnect", () => {
        console.log("- User disconnected, ID: " + socket.id);
        
        if(players.hasOwnProperty(myPlayerID)) {
            players[myPlayerID].socket = null;
            // Check if after 10 seconds socket is back, if not then delete player
            setTimeout(() => {
                if(players.hasOwnProperty(myPlayerID) && players[myPlayerID].socket == null) {
                    removePlayer(myPlayerID);
                    io.emit("removePlayer", myPlayerID)
                }
            }, 10000);
        }

        // Old Instadel
        //if(myPlayerID != -1) removePlayer(myPlayerID);
        //if(myPlayerID != -1) io.emit("removePlayer", myPlayerID)
    })
});

http.listen(port, () => {
    console.log(`Socket.IO server running at http://localhost:${port}/`);
});

function tick() {

}

setInterval(tick, 1000/60);