# Skull

Skullcrown multiplayer browser card game. Best played with 3 to 5 people. The game supports more people, but games tend to get very slow in that case.

## Rules

Every round starts with every player placing one card on the table in front of them.

When it's your turn, you get to do one of two things:

- Place another card in front of you, on top of the last one(s)
- Start a bet with some number, e.g. 1

If you have no more cards left in your hand, then you must start a bet.

Once a bet has started, no more cards may be played and players can do one of two things:

- Increase the bid
- Pass, after which the player can no longer participate in the bidding

Once someone wins the bet, they must turn over as many cards as they bet without turning over a skull. You must start with your cards and must turn them over from top to bottom (i.e. the card you placed last is the first to be turned over). Note that you do not necessarily need to turn over all cards, just as many as you bet. After turning over all of your own cards, you can choose cards from any other player's pile and in any order, but still from top to bottom.

If you get a skull, you get to choose one of your cards to give away. Once you give away your last card, you are out of the game. In this case, the next person gets to start the next round.

If you do not get any skulls, you get 1 point. In this case, the you get to start the next round.

You win the game if you get 2 points or if every other player has given away all of their cards.

There are two variants of the game: Double Skull and Spy.

### Double Skull

1. You start with 2 skulls and 6 crowns.
2. When you turn over a skull, you keep going until you have turned over the amount of cards that you bid.
3. After you turn over all the cards that you bid, you must remove as many cards as skulls that you got.
4. Points are only given if you dont turn over skulls that aren't yours. You will lose a card from your own skull, but will still get a point if you turn over no skulls that were played by other players.
5. You must have 3 points and at least 1 card the end of the round to win.

In other words, if you are about to get required amount of points but must first remove all of your cards then you will not win as you must at least have 1 in your hand.

### Spy

This variant is the most problematic one. Feel free to change the rules below as you'd like. Keep in mind that the game does not track any scores and you must do that manually. You must also use your own timer.

1. Multiple games are played in a row with scores kept track of between games.
2. There is no limit to the amount of points players can gain and every game lasts 8 minutes, after which the game goes into overtime until the current turn is finished.
3. Each game, one player is randomly and secretly picked to be the Spy and has the power to look at everyone's cards during the game.
4. At the end of the game, all players vote for who they think is the spy.
5. After voting is done the Spy reveals themselves and points are awarded according to the point table.

Point table:

- Innocent player
- - Voted incorrectly: no points
- - Voted correctly for Spy: amount of points they got during the game + 1
- Spy player
- - Was voted for by the majority: no points
- - Did not have the majority vote: amount of points they got during the game + 1

## Prerequisites

Skullcrown is built and developed with Node.js, so you'll need to <a href="https://nodejs.org/">install</a> it if you haven't already.

## Usage

Clone repository and use ```npm install``` in both ./client and ./server to install all required npm packages.\
Use ```npm start``` in ./client or ./server to start automatic compiling/bundling/restarting for both ./client and ./server and start the server. The first time you run the command it might throw some errors. In that case, cancel it by pressing Ctrl+C and then run it again.

## Credits

Icons are from various asset packs licensed under Creative Commons CC0 and made by <a href="https://kenney.nl/">Kenney</a>.

## License

Distributed under the ISC license. See `LICENSE` for more information.