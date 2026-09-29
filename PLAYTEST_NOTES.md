How to start the game:
1: cd "C:\Users\tthorne\OneDrive - Lenovo\Desktop\Documents\AntiGravity Projects\AntiGravity Deflategate"
2: npm run dev or npm run server if hosting with other players
3: Paste http://localhost:3000/ in a browser

Playtest #1 notes - Changes already Implemented
49ers ability should read "If you have less than 5 coins during the Refresh Phase. Instead of If you have < 5 coins during refresh
I want an event phase where an event card will flip over so that every player can see it changing. Otherwise, I think people will forget about it and make mistakes. Even on the first turn of the game
The PSI and coins are mixed up on the teams. For exams I selected 49ers and I should have 8 coins and 44 PSI. Starting coins should be between 5 and 15 and starting PSI should be between 25 and 60

For the teams UI, I'd like the ability to be more prominent and easier to read. Right now it feels like flavor text that could easily be forgotten

The 1st Player indicator is overlapping witht he edge of the team.

The buccaneers team ability should copy a different teams ability after the game start. So Bucs, should copy an ability. List that copied ability with it's ability so everyone knows which one they copied. Note: they choose the ability to copy at the start of the game after the other teams have chosen there team and before the round 1 players and events are revealed. Need to build a UI screen for this step if the player is the one with the bucs and copying someone else. If it is the CPU, no need to include the UI screen, just have them pick. 

I want avoid the game saying "it's your turn" and the player wondering what each CPU team did on their turns and then trying to figure it out. To avoid this lets add a next button so when the player clicks next, they see what 1 CPU team does. So in a 1 player, 3 CPU teams game, the player clicks next 3 times and sees what each CPU team did on their turns and then their turn starts. If they click once, it will show what the next CPU team does and stops until the person clicks next again. Also add a button that says skip to your turn if they want to fast forward to it. 
Example: turn order - Seahawks, then bucs, then cowboys, then 49ers (player). Seahawks go first. The 4 players in the auction block get revealed and user is prompted to click next. When they do they see which player the seahawks bid on and for how much. When they click next again they will see if the bucs outbid the seahawks or passed. If they pass I want to see a color or something showing the Bucs passed. Since they won't be able to bid on this player again if they passed. When they click next again they will see if the cowboys outbid or passed. Reminder that outbid has to be 1 more than the current bid (unless the bears bid last). Then the user will see it is there turn, the current bid price, and button on if they want to outbid or pass. Grey ou the outbid button if they don't have enough coins also add a max bid button if the user wants to play full price for the player. Also mak the outbid button variable so that the user could bid whatever amount of coins they want to. If the current bid is 5 coins and the user has 8 coins, the max bid button should read as 8 coins. When clicked it will auto fill the outbid amount to 8 coins. Same logic applies for CPU teams. But if the user wants to bid 7 coins  instead of 6 (which is one more) then they have the option to do so. 

Example 2: turn order - Seahawks, then bucs, then cowboys, then 49ers (player). Seahawks start the bidding and max bid on a player. Then the bucs would be the next team to choose which player to bid on. Once they choose, no other player may be bid on until the current choosen player has been won. 1 player at a time method. So bucs choose someone they bid 2, then cowboys bid 3, then 49ers pass, then bucs pass. Since Seahawks already have a player and can't win two players in one round they are auto removed from the bidding. Since the bucs and 49ers passed, the cowboys win the player. Since the bucs picked which choosen player to have everyone bid on first and didn't win the player they get to pick the choosen player for everyone to bid on again. 
Note: if a team is the one picking the player to bid on but has no coins or can't pay the minimum bid on any of the players available they auto forfeit the right to pick the palyer to bid on and that power passes to the next player. This doesn't happen often. 
Note: the team picking the player to bid on passes at the end of the round. So the seahawks started with that power, but in round 2 the bucs would be the team to do that at the start of round 2 until they have acquired a player. 
Note: when the team picking the player to bid on picks a player, they must bid the minimum amount of money on that player
Note: if a team has 0 coins they will not be able to outbid anyone and will receive the last player available at the end of bidding for 0 coins

Move the game feed log to the very bottom, I want to remove it for the final game but it is helpful for troubleshooting right now

When I acquire a player I am asked for which player to replace, but when I click on a player to replace, it doesn't do anything. I also want to add an eyeball icon on the side of this screen so that if I need to look at the other player's teams to strategize I can.

For the next button mentioned earlier for a player vs player game, but 2 players 2 cpu players. have the player 0 be the one to click next and edvance the CPU opponents. 
Also, change the player numbers to have 1 be the lowest and remove the player 0 option, so it will start with 1
----------------------
Playtest #2 notes - Changes already Implemented
The beginning UI when choosing your game, now no longer allows you to do player vs player. 
Realized when I said "the team picking the player to bid on" is called the first player. 
The beginning UI has the E in Deflategate cut off
When the Round 1 Event is revealed and I click Continue to round 1 auction, the UI does nothing. 
-----------------------
Playtest #3 notes - Changes already Implemented
Take out the Pass & Play (PvP) mode. Just have the vs CPU and Online Lobby. Have the online lobby option allow other online players to join, but fill in any empty spots with cpu. So for example, if I want a 6 player game and only 1 other online player joins me, I want there to be 4 other cpu players
YOu can remove the play against CPU opponents button
When I click the Next CPU Action button, nothing happens. When I click skip to my turn nothing happens as well. 
THe commanders ability allows them to mark a revealed player and the first player can't bid on that player. The first player is defined as the team that gets to pick the choosen player for everyone to bid on at the start of the round. If that team acquires a player and the next team starts choosing who to bid on this effect doesn't apply anymore. If the first player bids on someone and doesn't win the bid, that player chooses another person to bid on, but is still affected by the commanders choice. So the first player is only the player who starts the round picking a player to bid on. 
Note:if all other players have been acquired and the first player still hasn't acquired a player, they get auto receive the last player even if it has  been marked by the commanders since they no longer have a choice anymore. 
The browns can't get coins from players no matter what, in all instances. Therefore, they should only be targeting players that drop their PSI
The colts have unlimited spots, so any player they acquire doesn't need to replace one of their starting players but is added to them. Will need special UI for this since they will have a lot of player by the end of the game. 
----------------------
Playtest #4 notes - Changes already Implemented
Players show bid: 1-7. Would rather there be a Min: 1 on the top left and Max: 7 on the top right of the card. Move the TE/QB/WR/RB classification to the top middle of the card. Put the name fo the player below the classification, put the effect of the card below the name. Add Phase  1 instead of P1 and  put it on the bottom middle. 
Show the effects like +2 PSI/round as -2 PSI/Round. Also, covert the PSI/Round and coins/round and PSI immediate and Coins immediate to different UI symbols that are easy to differentiate. If I start with 40 PSI -2 PSI per round is good. There were some players that make the PSI go up, so make sure you reverse every player. if they were going down they should go up now (like ezekiel elliot)

Next to current bid you have Highest Bidder Player 4 (Panthers). Remove the Player 4 so it looks like Highest Bidder: Panthers. 
When I click Skip to my turn, sometimes it advances one step forward like a Next CPU Action button does and one time it advanced through every round and event and then the game end. Somethings wrong there. I want it to skip through all the cpu's turns to my next turn where I have to decide if I need to pass or outbid. If I already own a player, change the button to say Skip to Next Round. When I click that button, I want it to skip through all the cpu's rounds and go to the refresh phase where every turn player effects/team effect happen. I want to add a button on the step so it pauses here and then I click the button to advance to the next round and the event card, etc.
--------------------
Playtest #5 notes - Changes already Implemented
When the player is playing the CPU and it's their turn to nominate the player to be bid on, there is no UI indication saying it's their turn to do so.
When bidding on a player, there are two icons that let you increase or decrease the bid you are making. I only want one - keep the left and right ones that have a + and - sign. Remove the white ones that are up and down. 
When bidding on a player, the bid max button was set to 9 because I only have 9 coins, but the player's max bid was actually 10. When this happens, I want the max bid to say 10 and be unclickable so I can't bid 10. Maybe grayed out slightly to indicate that as well. 
When bidding on CJ Stroud the max bid is 9. The CPU was bidding against itself because I already acquired a player but got stuck when the bid was on 8. Not sure why. When I click the Next CPU Button nothing happened. 
The Skip to round refresh button is broken completely. When I click it after I've acquired a player, it brings up the events that happen for each round all the way the end of the game and then does nothing and stops at the last event. 
I was playing the Miami dolphins and had 0 coins and the effect didn't trigger to give me 3 extra coins. I want there to be some type of animation or some way for the user to know that it happened as well.  
-----------
Playtest #6 notes - Alreawdy completed
The active player is the one who nominates the next player. It isn't working correctly. If I'm active player and I bid on a player, but get outbid and ultimately the other team acquires the player. I am still the active player and get to nominate the next player. Same thing happens with the next player I nominate? I'm still the active player again. The Active player only changes once the active player has acquired a player. 
The bidding -/+ bar shouldn't allow me to go above the max for a player or above the amount of coins I have. 
When I am active player and I select a player to bid on, I should be able to bid the minimum on that player (usually 1). I tested it and when I select a player it's showing that I already bid 1 on that player and need to bid 2 to outbid myself? Nominating a player should not automatically put a bid on that player for you.
The Jaguars should have the ability to secretly look at the event deck and change the order once per game. When a user is playing as the jaguars, add an image of a deck of cards and allow the user to click on it to see the current order of events. There should be a button at the bottom that says "Use Ability" which allows them to drag and drop the events in a new order. When they click done, the events should be reordered. The ability to reorder the event deck should only be allowed once per game and the ability should be grayed out and unusable after it's used. However, the player can still look at the event order later on if they forget. Basically, always allowed to look at the event deck. One time use to reorder the event deck. Have this work for the CPU team as well. Let everyone know with a pop up when the ability for the Jaguars to reorder the event deck has been used. 
---------------
Playtest #7 Notes: - Changes already Implemented
The titans ability doesn't trigger at the start of the game. I want a UI element that triggers at the start of the game when I select the Titans. It should display 3 player cards and let me click one of them to add to my team (replacing one of my practice squad players). 
On Round 1 the active nominator should be the team with the most coins. A tie is decided by the team with the lowest PSI. This is to determine who starts as the active nominator in round 1. After round one the active nominator passes to the right every round. 
For the 49ers team ability double check that the coins are added to the lineup with end of turn effects BEFORE looking to see if the 49ers have below 5 coins to trigger teh double deflation. Therefore, the 49ers could be at 3 coins entering the refresh phase, have a end of round generate 2 coins player on their team and that would trigger first, making the coins 5 and negating the double deflation for that round. 
Penalty flag event. Make sure it is capping for the full ROUND, instead of just in the Refresh phase. So this includes instances as well. It is also the total for the round, not one player at a time. Meaning if the PSI is capped to 5 this round and I bought an instant deflate 3 player. I can now only deflate a maximum of 2 in the refresh phase. 
Let's add the Bills team ability into the game. The Bills say "After the Auction Phase, you may pay the Minimum cost for a player in the discard pile (once per game)". Add a little UI element for the Bills that says "Use Ability" that lets you select a player from the discard pile to add to your team. Only have this UI pop up after all teams have acquired a player during the Auction Phase. I want this to work for both the human user and CPU. Have other players wait while the player uses this ability if it is a player vs player game. Also add a way for the user to cancel, if they look into the discard pile and don't like any of the players. So the first UI pop up should be "Look at Discarded Players", then an ability to look through all discarded players and two buttons, one says "Use ability" and one says "Cancel". The Use ability button allows the user to choose a discarded player and add it to their lineup. 
Lets add the Ravens ability into the game. Ravens team ability says "At the end of the round, if you control 3 different positions in your lineup, gain 3 coins". have this ability trigger during the End of Round/Refresh Phase where you check if the user has 3 different positions in their lineup, if so have them gain 3 coins. Works for both user and CPU. Practice squad players don't count as a position. So if there is a practice squad player in their lineup, they won't gain +3 coins
Lets add the Bengals ability into the game. The Bengals ability says " Players with instant abilities give you +2 coins/deflate. When you acquire a player, you may discard them instead of replacing a player. This ability has two parts. The first part is it increases the deflate and coins of all instant abilities on player cards by 2. So a deflate 3 instant player will deflate 5 for the bengals but only 3 for anyone else. If a player card gives 2 coins instant and 2 deflate instant the Bengals will get 4 deflate instant and 4 coins instant. If a player is acquired that has instant inflate, nothing is changed by this ability, still gain normal instant inflate. When this happens the only UI difference would be maybe make the Ability glow for a few seconds right after it triggers. The second part of the ability is they can discard a newly acquired player instead of replacing a player. Have a UI option to Disscard in the screen that makes you replace one of your active players. 
Lets add the Steelers ability to the game. The Steelers say "At the start of the round, if you are the richest player, give every other player a PSI". Have this ability trigger at the start of every round before the Event Phase. This happens even on round 1. If they are the richest player, if a tie this doesn't happen. If the conditions are met the trigger would give each player 1 PSI, as well as removing 1 PSI from the Steelers everytime this happens. So in a 4 player game, if the Steelers are the richest team, they would give each other team 1 PSI and remove 3 PSI from themselves. Add a UI element that shows the PSI being given to each team. 
Lets add the Broncos Ability into the game. The Broncos say "The first Refresh Phase after you buy a player, ignore their every turn abilities". This ability is a negative to the player to compensate for the high starting coins and low starting PSI. When the Broncos buy a player, everything is normal - Instant abilities happen normally. During the refresh phase, check if the player has been purchased this round. If so, ignore all every turn abilities. If not, let them trigger normally. this applies to inflate, deflate, negative coins, positive coins.If it's an end of turn ability it won't happen during the first refresh phase after purchasing that player. have it work for both CPU and human players. Add a UI element that shows a player was passed over (maybe highlight the player in red for a few seconds). 
Lets add the Chiefs ability into the game. The chiefs say "At the start of the Auction Phase you may pay the Minimum cost of a player without bidding (once per game)". Trigger this ability at the start of the Auction Phase, after the players have been revealed. Let the user or CPU choose if they want to use the ability that round or not. If the ability has already been used this game you can skip over this trigger. If it has not been used this game have a UI pop up that asks if they want to use the ability or not, make sure the UI doesn't cover the players available to acquire this round. Have other teams wait while making the selection. If CPU has the Chiefs and is making the selection, no need to wait while they select, but do show that they used the ability and added a player with UI elements. 
Lets add the Raiders ability into the game. The Raiders say "Before the Auction Phase, you may give 1 PSI you control to another player". This ability triggers after the event phase and before the auction phase, before the players in the auction phase have been revealed. When triggered, the Raiders will choose 1 team and give them one of their PSI. So the raiders will go down 1 and the chosen team will go up one. Have this work for the CPU as well and have them choose the team that has the lowest PSI always. Add UI elements that will let the human user choose which team to give a PSI to. Add UI elements when they choose a team that shows the PSI being given to them and the Raider's PSI going down.
Lets add the Eagles ability into the game. The Eagles say "After the Auction Phase, you may pay 3 coins to raise every other player's PSI by 3 (Limit twice per round)". This ability triggers after the auction phase and before the refresh phase. When triggered, the Eagles will be presented with 2 options - Use Ability or Pass. If they use the ability, they will pay 3 coins and every other team will gain 3 PSI. Then they will be given two options again - Use ability again or Pass. If they use the ability, they will pay 3 coins and every other team will gain 3 PSI. If they click Pass they will skip this effect and continue playing as normal. If the Eagles don't have enough coins to use the ability, have that option greyed out. Have this work for both CPU and human players. If the CPU has the Eagles, have them use the ability on a certain random percentage that is more likely the more coins they have and more likely the lower PSI other players have. Have a UI element that shows the Eagles coins going down and every other team's PSI going up. 
Lets add the Lions ability into the game. The Lions say "During the Auction Phase, if you are the first player to claim a player, gain coins equal to the number of teams in the game". This ability triggers during the Auction Phase immediately after the Lions have acquired a player. If it was the first player acquired during the auction phase the requirement for the trigger is met and the effect is gaining X amount of coins where X is equal to the number of teams in the game (in a 4 player game, the Lions would gain 4 coins). This works for the CPU and human players. All team abilities should work for both CPU and human players. When CPU is playing the Lions have it be more aggressive in bidding when it is the first player acquired that auciton phase. Add a UI element that shows the Lions coins going up when they trigger this ability. 
Lets add the Falcons ability into the game. The Falcons say "Whenever you are starting the bid during the Auction Phase, you may discard all remaining players available and replace them with new players (limit once per phase)". This ability is triggered whenever the Falcons are the active player/nominating player and are selecting which player to bid on next. When this ability is triggered the user will be presented with 2 options - Use Ability or Pass. If they choose to use the ability, the game will discard all remaining players available and replace them with new players from the top of the deck. If only 2 players are remaining, only 2 new players will come out. If they choose to pass the game continues as normal. This ability can only be used once per phase. Phase 1 is Rounds 1-4, Phase 2 is rounds 5-7, HOF phase is rounds 8-10. So this ability can be used a maximum of three times per game, if triggered once every phase. If the ability has already been triggered that phase, skip over the trigger, no need to present the user with only one option to pass/not use the ability. Add UI elements when triggered. Make the ability work for both human and CPU. After the ability if triggered the falcons will then select a player to bid on normally. 
Lets add the Saints ability into the game. The Saints say "Negative coins and inflation don't effect you". This effect is active always and will prevent their PSI from going up and coins from going down. Coins will still go down when bidding/acquiring a player, but not outside of that. Coins will also go down if there is an event card that says pay 10 coins to buy an extra practice squad player or drow top card of player deck and pay max price to acquire the player and the Saints decide to do that option. Event cards that raise their deflate will be ignored and opponent team abilities that give PSI to other players are ignored. If a team like the Raiders do give the Saints a PSI, the Saints PSI will not go up, but the Raiders PSi will still go down. Have this work for both human and CPU.
Lets add the Cardinals ability into the game. The Cardinals say "During the Auction Phase, after players have been revealed, you may look at the top card of the Player Deck. Then swap it with one of the revealed players or put it back". This ability is triggered during the auction phase immediately after the players have been revealed and happens every round. Give the Cardinals the choice to look at the top card of the deck ("Use ability") or Pass. If they pass, game proceeds as normal. If they use ability, reveal the top card of the deck. The Cardinals will then choose one of the currect auction row players to swap with the newly revealed player that was the top card of the deck. The swapped card will be on the top of the deck and be revealed next round unless the deck gets shuffled (only happens when Phase 2/HOF players are shuffled into the base deck). Have UI elements that will let the human Cardinals player choose which team to swap the card with (if they choose to use the ability). Have UI elements that pause other players game while Cardinals ability is in effect. 
Lets add the Rams ability into the game. The Rams say "Once per game, you may put a x2 token on one of your non-Phase 1 players". Add a UI button to the screen for the Rams team only that Says "Use Ability". When clicked it will allow the Rams team to put a x2 token on one of their Active players. That player will now double it's end of round effects for the rest of the game. This works for both human and CPU. If CPU has the Rams, have it use the ability on the best Phase 2 or HOF player it has acquired (based on End of ROund abilities). If the Rams don't have a non-phase 1 player, grey out the button. 
Lets add the Packers ability into the game. The Packers say "If all your players are Phase 1 players, deflate 4 at the end of the round. Gain 1 coin every time you acquire a Phase 1 player". Add a UI element that shows the Packers coins going up when they trigger this ability. Add a UI element that shows the Packers PSI going down when they have all Phase 1 players. Practice Squad players do not count as Phase 1 players (meaning if the Packers have 2 Phase 1 players and 1 Practice Squad player, they will not trigger this ability). Have this ability work for both human and CPU. If CPU has the Packers, have it target Phase 1 players more aggresively. 
Add a UI element that will let user easily differentiate between Phase 1, Phase 2, and HOF players. 
----------
Playtest #8: (Changes already implemented into the game)
Lets add the event "Raw Talent" into the game. It says "All Phase 1 players receive double coins and deflation this round". This event applies to only Phase 1 players and will affect instant and end of round effects. For example, if a Phase 1 QB has an instant effect of "Gain 5 coins", they will gain 10 coins instead. If a Phase 1 QB has an end of round effect of "Receive 2 coins" and "Gain 10 coins", they will receive 14 coins in total that round (4 coins from the end of round effect, 10 coins from the instant effect). 
Lets add the event "New Cap Limit" into the game. It says "Each player may pay 10 coins to add a Practice Squad Player to their team". When this event is revealed give all human and cpu teams a choice to pay 10 coins to add an additional practice squad player to their lineup or pass. If they don't have 10 coins, grey out that option. If they do have 10 coins and choose to do it, they will add an addition lineup spot to their team. For example, if they had a full lineup of 3 phase 1 players, they now have 3 phase 1 players and a practice squad player as their 4th player. If the team is Seattle, I believe they already have 4 active lineup spots, meaning they will upgrade from 4 to 5 players. Add UI effects. Pause the game while people are choosing
Lets add the event "Cold Air" into the game. It says "Deflate each player's PSI by 7". This one is simple, it deflates everyone's PSI by 7 when revealed. Add UI elements. If this would reduce a players PSI to 0 they win the game. 
Lets add the event "Rivalry" into the game. It says "Starting with the first player, each player gives 1 PSI to a player of their choice". Pause game. Give first player a UI button to click on any other player to give them 1 PSI. After they click, move to next player, pause again and let them give 1 PSI to any player (including the one before them). Repeat until all players have given 1 PSI. 
Lets add the event "Offensive Battle" into the game. It says "Your lineup receives double coins and delation this round". This event gives both double coins and double deflation to both instant and end or round effects. If you gain inflate, that doesn't double. 
Lets add the event "Penalty Flag" into the game. It says "Each player can only deflate a maximum of 5 PSI this round". This event will not allow any player to deflate more than 5 PSI that round, even if they have an ability that would allow them to deflate more than 5 PSI. No matter how you deflate PSI, you cannot deflate more than 5 this round. If you were to deflate more than 5, add a UI element that shows it getting capped at 5 deflate.
Lets add the event "Hot Air" into the game. It says "Inflate each player's PSI by 7". This one is simple, it inflates everyone's PSI by 7 when revealed. Add UI elements to show this. 
Lets add the event "Penalty Flag" into the game. It says "Each player can only make a maximum of 10 coins this round". This event will not allow any player to make more than 10 coins that round, even if they have an ability that would allow them to make more than 10 coins. This will include every effect that happens this round. No matter how you generate the coins, you cannot gain more than 10 this round. If you were to get more than 10, add a UI element that shows it getting capped at 10 coins. 
Lets add the event "Team Legend Returns" into the game. It says "Add a random Phase 2 player and add it to the top of the Player Deck (Hall of Fame player instead if it is round 5 or later)". If this event reveals in rounds 1-4, randomly select one of the phase 2 players and add it to the top of the deck. Reminder that when revealing player cards before the auction phase, we draw from the top of the deck so that player that was placed on the top of the deck should come out the round this event is revealed. If the event is revealed during rounds 5+, it will add a random Hall of Fame player to the top of the deck. Note that this isn't an additional player that gets revealed during the auction phase, if there is 4 teams in the game there will still only be 4 players revealed. Add UI effect that shows a player getting put on the top of the deck. 
Lets add the event "Refs Check" into the game. It says "All Quarterbacks can only deflate PSI or make coins this round (You choose for each QB):. This round quarterbakcs that have a deflate and a coin effect will only use 1 (player gets the option to choose which one). Add UI that lets user choose which effect is used, this will pause the game until everyone has chosen. This UI choice happens when the QB first applies their effect (so usually during the refresh phase, but if a QB is bought that round and has an instant it would happen when bought). 
Lets add the event "Rookie Class" into the game. It says "Draw twice the number of players during the Auction Phase. Players will buy two players this round instead of 1. The first player passes like normal during the Bidding Phase and repeats once every player has acquired 1 player". Each player will acquire 2 players that round instead of 1. Therefore, after they buy their first player, they can still acquire a second player. After buying their second player, make them not be able to bid or buy any more players. When this event is drawn, twice the number of players are revealed. If there are 4 players, 8 players are revealed. If there are 10 players, 20 players are revealed. 
Lets add the event "Trade Rumors" into the game. It says "Everyone picks one of their Active players and passes it to the right". Add UI elements. This effects humans and CPU. Each team will have a UI that lets them select one of their players to pass to the team on the right (clockwise). So team 1 passes to team 2, team 2 passes to team 3, team 3 passes to team 4, and team 4 passes to team 1. Once everyone chooses show the players swapping teams. This happens immediately after the event is revealed. 
Lets add the event "1st Overall Pick" into the game. It says "The player with the highest amount of PSI deflates to match the player with the 2nd highest PSI". This is a simple one. This happens immediately. Compare everyone's PSI, the team that has the highest will deflate to match the second highest PSI team. If two teams are tied for the highest PSI, this event will have no effect. Add UI elements to show which team is getting deflated and by how much. 
Lets add the event "Player Demands a Trade" into the game. It says "Draw the top card of the deck, players may bid on that player before the regular bidding phase". This effect happens immediately after the event is revealed. When triggered, reveal the top card of the deck, have a bonus auction phase where players can bid on that player. This bidding will proceed normally. If someone wins, they acquire the player. This will not count toward their limit of buying only 1 player this round. So if they win this bonus auction phase, they can still buy a second player during the regular auction phase. 
Lets add the event "Overpaid" into the game. It says Increase the Maximum cost to buy each player by 4". This will add 4 to the max cost of all players this round. So if a player was max: 10, it is now max: 14. Apply this change to the max bid button during the round. It only applies for this round and will go back to normal the next round. 
Lets add the event "Free Agency" into the game. It says Each player draws the top card of the deck and can pay the max price to replace on of their active Player Cards with the new card". This effect happens immediately. Each player will draw their own top card of the deck and decide if they want to pay the max price to acquire the player. This acquired player will not count toward their limit of acquiring only 1 player per round. Everyone should have the option to pass as well. Add UI elements to make this happen. 

Change the End of Round Summary. I want there to be a box that pops up that says End of the Auction Phase. Time for the Refresh Phase with a button that says "Start". When clicked, UI effects happen. I want it to visually show the coins and PSI changing one team at a time. After each team has changed, shows a summary box above each team that says a summary of what changed. 

When a round is completed, the game gets stuck after the refresh phase and doesn't reveal the next event card to indicate the next round starting. 
---------------
Playtest #9: (already implemented)
When there is one player left in the auction row, don't automatically skip the bid/nomination step. Still have the last team without a player bought that round nominate the last player available and let them bid on that player. After they bid on the player, no one can outbid them so they automatically acquire that player for the price they bid at. 
I also encountered a bug where the Buccaneers team ability copied the ability of the Titans. The bucs looked at the top three cards of the palyers deck and acquired one for free. Which is correct. The Titans, however, where skipped and didn't do this effect. Make sure the Titans do this effect. Also check the other teams that if the bucs copy any of them that there are no bugs. Note: The Bucs copy the ability so there are 2 of those abilities in the game now, they don't steal that ability. 
I now see the "Advance to Round 2 Event" button, but when I click it nothing happens. When I click this button I want the game to proceed to the event phase and start the next round. However, when I click the button it doesn't reveal the next event card and gets stuck with no way to continue the game. And the Active Round Event at the top right corner of the screen stays the same. 
Not sure if you are doing this or not but at the start of the game randomly select 10 of the 16 event cards. Then shuffle all the event cards together to make the event deck.
Also redo all the phase 1 players in the deck. Below is the full list of phase 1 players that should be in the game. Do not add any more or take out any from the list below.
Phase 1 Player List:
Phase 1 Players (these players will make up the initial player deck during rounds 1-4)
QB – Deshaun Watson - Min: 1, Max: 5 – 4 inflate per round, 5 coins per round
WR – Rome Odunze - Min: 1, Max: 3 – 5 coins instantly
RB – Bijan Robinson - Min: 1, Max: 6 – 3 deflate instantly
WR – AJ Brown - Min: 1, Max: 9 – 3 coins per round
QB – Kirk Cousins - Min: 1, Max: 10 – 4 deflate per round, 1 coin per round
TE – George Kittle - Min: 1, Max: 15 – 2 deflate per round, 2 deflate instantly
RB – Chuba Hubbard - Min: 1, Max: 3 – deflate 2 instantly
TE – Dallas Goedert - Min: 1, Max: 10 – 2 deflate per round
WR – Juju Smith-Schuster - Min: 1, Max: 5 – 2 coins per round
WR – Amari Cooper - Min: 1, Max: 9 – 3 coins per round
RB – Isaiah Pacheco - Min: 1, Max: 15 – Text: “When you acquire this player, shuffle the Player Card deck and draw the top card. Acquire that player instead of this one. Discard this card”. This effect will trigger after a team acquires this player and wins the bid but before the pop up box to replace one of your players with the new acquired player. Have a UI effect that draws the top card from the deck and replaces Isaiah Pacheco with the new player. Then have the pop up box to replace one of your players with the new player appear and have the team pick which player to replace. The game proceeds as normal at that point.
TE – Brock Bowers - Min: 1, Max: 15 – deflate 2 per round, deflate 2 instantly
WR – Odell Beckham Jr. - Min: 1, Max: 10 – 3 coins per round
WR – DeVonta Smith - Min: 1, Max: 9 – 3 coins per round
WR – Jaylen Waddle - Min: 1, Max: 12 – 2 coins per round, Text: “After a player bids on this player, they immediately gain 1 coin”. This effect happens during the auction phase whenever someone places a bid on Jaylen Waddle. As soon as a team bids any amount of coins on this player have that team gain 1 coin immediately. If that team later in the auction phase bids again on Jaylen Waddle they would gain another coins, there is no limit to this effect. When a team triggers this effect add a UI effect showing +1 coin for that team. Happens for both CPU and human players.
TE – Zach Ertz - Min: 1, Max: 10 – 2 deflate per round
WR – Brandon Aiyuk - Min: 1, Max: 12 – 2 coins per round, Text: “If you paid the maximum for this player, 4 coins per round instead”. If the team that acquired Brandon Aiyuk paid max price for him, replace his 2 coins per round effect with a 4 coins per round instead. 
WR – DeAndre Hopkins - Min: 1, Max: 9 – 3 coins per round
TE – Sam LaPorta - Min: 1, Max: 11 – 2 deflate per round
WR – Adam Thielen - Min: 1, Max: 5 – 2 coins per round
TE – Dalton Schultz - Min: 1, Max: 5 – 1 deflate per round, 1 coin instantly
WR – Drake London - Min: 1, Max: 14 – 4 coins per round
RB – Kyren Williams - Min: 1, Max: 8 – 4 deflate instantly
WR – Mike Evans - Min: 1, Max: 8 – 3 coins per round
WR – Michael Pittman Jr. - Min: 1, Max: 10 – 3 coins per round
TE – TJ Hockenson - Min: 1, Max: 10 – 2 deflate per round
WR – Xavier Legette - Min: 1, Max: 2 – 2 coins instantly
QB – Josh Allen - Min: 1, Max: 11 – 2 deflate per round, 4 coins instantly
TE – Darren Waller - Min: 1, Max: 11 – 2 deflate per round
WR – Diontae Johnson - Min: 1, Max: 8 – 3 coins per round
WR – Tee Higgins - Min: 1, Max: 15 – 4 coins per round
WR – Michael Thomas - Min: 1, Max: 5 – 2 coins per round
TE – Greg Olsen - Min: 1, Max: 14 -2 deflate per round, 2 deflate instantly
WR – Malik Nabers - Min: 1, Max: 3 – 5 coins instantly
TE – Mark Andrews - Min: 1, Max: 9 – 2 deflate per round
TE – Hunter Henry - Min: 1, Max: 12 – 8 deflate instantly, inflate 3 per round
QB – Trevor Lawrence - Min: 1, Max: 15 – 8 inflate instantly, 3 deflate per round
RB - Ezekiel Elliott - Min: 1, Max: 7 – 5 deflate instantly, minus 2 coins per round
RB – De’Von Achane - Min: 1, Max: 4 – 2 deflate instantly
TE – Kyle Pitts - Min: 1, Max: 9 – 2 deflate per round
WR – Jalen Coker - Min: 1, Max: 5 – 2 coins per round
RB – D’Andre Swift - Min: 1, Max: 9 – 4 deflate instantly
QB – Jayden Daniels - Min: 1, Max: 10 – 3 deflate instantly, 2 coins per round
RB – Breece Hall - Min: 1, Max: 5 – 3 deflate instantly
----------------------
Playtest #10: (already completed)
There is a Discard Acquired player button in the Replacement Screen. So after a team acquires a player, the button to discard that acquired player is presented. This button should only be available to the Bengals team, since they have that special ability. All other teams should not be able to discard the acquired player. Additionally, when the Bengals do choose to discard that player, they will still gain any instant effects of that player they acquired. 
---------------------
Playtest #11: (complete)
Add a UI element for whenever a team acquires a player that take the player card and moves it across the screen to the team that won it. 
Make all the test on the player cards in the auction row easier to read. So make them bigger.
Add these following Phase 2 players into the Player deck.
Dont add any additional players, and don't remove any of the existing players from the deck. Just remove the current Phase 2 players in the game and replace them with the player list below. 
Phase 2 Players (shuffle into the player deck at the start of round 5)
QB – Kyler Murray – Min: 2, Max: 13 – deflate 3 per round, deflate 1 instantly
WR – DJ Moore – Min: 2, Max: 10 – deflate 4 per round, Text: “Only players with 10 or less may bid on this player”. Any team that has 11 coins or more is not eligible to bid on DJ Moore. A team with 11 coins or more cannot select him when they are choosing a player to bid on. 
RB – Derrick Henry – Min: 2, Max: 16 – Deflate 4 per round
QB – Justin Herbert – Min: 2, Max: 9 – Deflate 1 per round, deflate 3 instantly
WR – Puka Nacua – Min: 2, Max: 15 – Text: “At the start of the Refresh Phase, pick an Active Player you control. This player gains the effect of that player (immediates don’t apply)”. This effect triggers at the start of every refresh phase. The player has to select one of the other players on his team and have Puka Nacua copy that players effect this round. This will not give any instant effects, only end of round abilities or special text abilities will apply. 
WR – DK Metcalf – Min: 2, Max: 10 – 3 coins per round
WR – Marvin Harrison Jr. – Min: 1, Max: 2 – 4 coins instantly
WR – Stefon Diggs – Min: 2, Max: 13 – 4 coins per round
WR – Garrett Wilson - Min: 2, Max: 14 – 4 coins per round
WR – Deebo Samuel - Min: 2, Max: 4 – 6 coins instantly
QB – Patrick Mahomes - Min: 2, Max: 20 – 5 deflate per round, 3 coins per round
QB – Brock Purdy - Min: 2, Max: 15 – 1 deflate per round, 1 coin per round, Text: “If this player is one of the last two players acquired this round, gain 5 coins instantly and 3 deflate instantly”. This effect triggers if Brock Purdy is one of the last two players acquired this round. When triggered, the player who acquired Brock Purdy gains 5 coins instantly and 3 deflate instantly. This effect happens immediately after a team has acquired Brock Purdy and the conditions are met. 
QB – Joe Burrow - Min: 2, Max: 17 – 3 deflate per round, 2 coins per round
WR – Chris Olave - Min: 1, Max: 3 – 5 coins instantly
RB – Adrian Peterson - Min: 2, Max: 19 – 5 deflate per round
RB – Aaron Jones - Min: 2, Max: 16 – 7 deflate instantly
WR – Davante Adams - Min: 2, Max: 16 – 3 coins per round
WR – CeeDee Lamb - Min: 2, Max: 8 – 5 coins per round
WR – Cooper Kupp - Min: 2, Max: 15 – 4 coins per round
WR – Tyreek Hill – Min: 1, Max: 12 – 2 deflate per round, Text: “After a player bids on this player, they immediately gain 1 deflate instantly”. This effect happens during the auction phase whenever someone places a bid on Tyreek Hill. As soon as a team bids any amount of coins on this player have that team deflates 1 PSI immediately. If that team later in the auction phase bids again on Tyreek Hill they would deflate another PSI, there is no limit to this effect. When a team triggers this effect add a UI effect showing -1 PSI for that team. Happens for both CPU and human players.
QB – Aaron Rodgers - Min: 2, Max: 10 – deflate 1 per round, 3 coins per round
WR – Justin Jefferson - Min: 2, Max: 19 – 5 coins per round
RB – Tony Pollard - Min: 2, Max: 7 – 4 deflate instantly
WR – Amon St. Brown - Min: 2, Max: 15 – Text: “Steal 1 coin from each player at the end of the Refresh Phase”. This effect happens as a per round ability. Except instead of generating coins or deflate put every other team’s coins down by 1 and put your coins up by 1 for each team that was affected this way. If an opponent team has 0 coins, this will not make them go negative and will not give you +1 coin for that team. 
WR – Ja’Marr Chase - Min: 2, Max: 18 – 5 coins per round
RB – Jahmyr Gibbs - Min: 2, Max: 18 – 7 deflate instantly
RB – Jonathan Taylor - Min: 2, Max: 10 – 3 deflate per round
QB – Jalen Hurts - Min: 2, Max: 15 – 2 deflate per round, 2 coins per round
WR – Terry McLaurin - Min: 2, Max: 14 – 4 coins per round
RB – Josh Jacobs - Min: 2, Max: 15 – 3 deflate per round
WR – Keenan Allen – Min: 1, Max: 3 – 5 coins instantly
RB – Nick Chubb - Min: 2, Max: 11 – 3 deflate per round
WR – Chris Godwin - Min: 2, Max: 8 – 3 deflate per round
WR – Tank Dell - Min: 2, Max: 9 – 3 coins per round
RB – Saquon Barkley - Min: 2, Max: 16 – 4 deflate per round
RB – James Conner - Min: 2, Max: 12 – 3 deflate per round
QB – Cam Newton - Min: 2, Max: 12 – 4 deflate instantly, 2 coins per round
QB – Russell Wilson – Min: 1, Max: 6 – 1 deflate per round, 1 coin per round
QB – Drew Brees - Min: 2, Max: 10 – 5 deflate instantly, 1 coin per round
QB – Lamar Jackson – Min: 2, Max: 19 – 4 deflate per round, 3 coins per round
QB – Dak Prescott - Min: 2, Max: 15 – 2 deflate per round, 2 coins per round
RB – Christian McCaffrey - Min: 2, Max: 17 – 4 deflate per round
WR – George Pickens – Min: 1, Max: 3 – 5 coins instantly
TE – Travis Kelce - Min: 2, Max: 21 – 6 deflate per round
RB – Marshawn Lynch - Min: 2, Max: 20 – 5 deflate per round
RB – Kenneth Walker - Min: 2, Max: 14 – 6 deflate instantly

Add these following Hall of Fame players into the Player deck.
Dont add any additional players, and don't remove any of the existing players from the deck. Just remove the current Hall of Fame players in the game and replace them with the player list below. 
Hall of Fame Players (shuffle into the player deck at the start of round 8)
WR - Calvin Johnson – Min: 5, Max: 23 – Deflate 7 per round
TE – Tony Gonzalez – Min: 5, Max: 25 – Deflate 8 per round
QB – Peyton Manning – Min: 5, Max:26 – Deflate 8 per round
WR – Jerry Rice – Min: 5, Max: 25 – Deflate 8 per round
QB – Brett Farve – Min: 5, Max: 28 – Deflate 9 per round
TE – Rob Gronkowski – Min: 5, Max: 24 – deflate 7 per round
QB – Tom Brady – Min: 5, Max: 31 – deflate 10 per round
QB – Joe Montana – Min: 5, Max: 27 – deflate 9 per round
QB – John Elway – Min: 5, Max: 28 – deflate 9 per round
WR – Randy Moss – Min: 5, max: 23 – deflate 7 per round
----------------
Playtest #12: (complete)
variance for the CPU
Crashes in Rivalry event

----------------
Playtest #13: (Complete)
1. Pacheco and special effect players show description text on card
2. Richest player bid cap matches richest opponent coins
3. Emergency investment reserve for Phase 2 (Round 4) and Hall of Fame (Round 7)
4. 3-roster slot rotation strategy (2 passive engines + 1 rotating slot for Instant cards)

----------------
Playtest #14: (Complete)
1. Jaguars Secret Event Deck order inversion fix (drawing from top index 0 matches modal)
2. Strict nomination bidding and affordability checks
3. Pass nomination capability when unable to afford any available card

----------------
Playtest #15: (Complete)
1. Bengals Instant Targeting: Bengals heavily target instant ability players after securing 1–2 per-round engines, capitalizing on their +2 instant bonus and discard flexibility.
2. Out of Bidding Red Highlight: Highlight team card outlines in red in the roster grid once they have acquired their player(s) for the round (p.hasWonAuction === true).
3. Overpaid Event Max Price Up Arrow: Display an up arrow (▲) next to the Max price on player cards during the Overpaid event to clearly indicate the +4 max bid boost.
4. Texans QB Targeting: Texans heavily target QBs due to their passive +2 coins & -2 PSI per QB Refresh Phase ability.
5. Jaguars CPU Ability Timing & "Got It" Freeze Fix:
   - CPU Jaguars reorders the event deck before the upcoming round's event card is drawn.
   - Fix the "Got It" button freeze when CPU Jaguars reorders: dismissJaguarsPopup in eventPhase.moves and all phases.
---------------
Playtest #16: (Complete)
The cardinals ability is setup perfectly, however, I need be able to see the card and what it does that I am swapping in. Right now it just says the name of the card I'm swapping, but I don't know the details of it. I also want to be able to look at the current teams and their rosters and abilities while choosing this so add a button to allow me to see the board state and then come back and make my choice.
When Playing Player vs Player or Player vs Player vs cpu, need to have a some indication in the Current turn or Auction block that it is your turn to select a player to bid in. Make that indication yellow so it is easy to see. 

------------------
Playtest #17: (Complete)
1. Hover Tooltips on Card Effects:
   - 🔄: "End of Round Effect: Happens at the end of every round"
   - ⚡: "Instant effect: Happens immediately when bought"
2. Bid Control UI Cleanup:
   - Suppressed browser default up/down number spinner arrows in the auction input.
   - Clean left/right arrow buttons (◀ and ▶) for adjusting bids.
3. 0-Coin Acquisition Resolution:
   - When a player has 0 coins and is the sole remaining bidder for the round, allows bidding 0 coins via an active "Acquire for 0 Coins" button, resolving immediately without freezing.
4. Lions AI Aggression & Opponent Counter-Play:
   - Detroit Lions CPU aggressively targets cards they can pay max bid on or locks out opponents on the first player of each round to secure the franchise bonus coins.
   - Opponent CPUs aggressively counter-bid / price-bump against Lions on the 1st player of the round until the cost of blocking outweighs the benefit.
5. Deck Shuffle Progression & Team Legend Returns:
   - Phase 2 players shuffle into the deck at Round 4 (after Round 3).
   - Hall of Fame legends shuffle into the deck at Round 7 (after Round 6).
   - "Team Legend Returns" event awards Phase 2 cards on rounds 1–6 and Hall of Fame legends on rounds 7+.
   - CPU anticipation savings adjusted to Round 3 (approaching Phase 2) and Round 6 (approaching HOF).
-------------------
Playtest #18: (Complete)
1. Washington Commanders Team Ability:
   - Fixed and polished for both Human and CPU players.
   - Activates in preAuctionPhase after auction player cards are revealed.
   - Allows marking an auction player so the current First Player (and opening nominator) cannot nominate or bid on that player this round.
   - If the Commanders themselves are the First/Nominating team for the round, the ability does not trigger and is logged as skipped.
   - When the First Player acquires any player card this round, the restriction lifts immediately and the marked card behaves normally for all franchises.
   - Added interactive Commanders selection modal for human players and strategic high-value target selection for CPU Commanders.
   - Added visual badges ("🚫 Blocked for First Player" and "🎖️ Commanders Targeted") and disabled nomination/bidding states.
2. Non-Team-Specific General Rules & Guide Section:
   - Added comprehensive, beautifully formatted RulesModal accessible both from the Starting/Lobby screen ("📖 How to Play & Rules Guide") and in-game header ("📖 Rules Guide").
   - Covers:
     - Primary Objective: Deflating PSI to 0 to win immediately, or lowest PSI at end of 10 rounds, plus tiebreaker rules.
     - 4 Round Phases: Event Phase, Pre-Auction Phase, Auction Phase, and Refresh Phase.
     - Card Symbols & Effects: ⚡ Instant (triggers on purchase only), 🔄 Recurring (triggers every round in Refresh), and ⭐ Special/custom card conditions.
     - Era Progression: Phase 1 (Rounds 1–3), Phase 2 (Rounds 4–6), and Hall of Fame Legends (Rounds 7–10).
     - Bidding Rules & Edge Cases: Nominations, clockwise turns, Buy Max instant acquisition, Pass is final, the Sole Remaining 0-Coin rule, DJ Moore restriction, and Bears defense.
     - Lineups & Practice Squad: 5-player active roster limit, Practice Squad benching, roster cuts/swaps, and franchise identities.
-------------------
Playtest #19:
Lions ability isn't working for the CPU teams. When the Lions win the first player in the round, they should gain coins, but they dont. Check that this is working for both CPU and Human players. 
The Player Demands a trade event doesn't work right. When this event happens, instead of making a seperate UI pop up screen, keep the normal auction row and just have one player reveal there. Then do everything the same as a normal auction would with the nominating/first player bidding on them and continuing clockwise being outbid, etc. Then after that player is won proceed with the normal auction.
When biding during the auction phase, I notice that when I bid 7 for the last player, the next player will automatically set my bid meter at 7. I want the bid to always be set at the lowest I can bid, just to make it easier. 
When the event rookie class happens that reveals twice the number of player cards in the auction row. I noticed a bug where when the first player/nominating player acquires a player, they are still the nominating player when the nominating player should pass clockwise. They are still able to bid and acquire a second player but they are no longer the first player. However, if every other team has acquired a player already or in the future bids, the first player would loop around and they would be the nominating player again. Basically, once the nominating player acquires a player, the nominating player would pass clockwise to the next team, if that team has already acquired a player it would skip them and go to the next team, if that team has already acquired a player it would skip them and go to the next team, etc so it is possible that it skips all the other teams and loops back around to the original nominating player. 
Vikings under 27 psi, doesn't happen with instants currently
I don't see the CPUs using their abilities. When they do I want a small popup to appear for a second and then a notification to display at the top of the screen where the events section is like a banner kindof. I want these for effects like the eagles, but not the panthers and cowboys. The difference is one doesn't happen Everytime. I want one for the miami dolphins
I don't think the Cardinals ability is happening. If it is then I can't see it happening.
The CPU is not targeting players right when picking who to nominate. A lot of times they just pick the best guy on the board. Not always bad, but sometimes you want to pick the player that's good but not the best when you are the first player, especially when you don't have a lot of money and know you won't win the best player. This makes the strategy do I try to get this midde player for cheap and take myself out of the running for the really good player I want or do I pass and let this other team get this guy for cheap and risk that I will get one of the guys I want and not get one of the guys I don't want.
Also if I the human nominate the worst player on the board and bid 1 for them, no one should outbid me for them. Why pay 2 for the worst player when you could get a better player for only 1?
When an instant ability happens when acquiring a player, I want a little ui in the coins/psi box showing it going up. Like a gambling slot machine, the number slowly goes up/down and increases in speed if it is a bigger number like -7 PSI.
It seems like the Hof or phase 2 cards, a lot of them are coming out the round they are shuffled into the deck. Make sure they get shuffled completely randomly. There are some games we never see a Hof players come out.
The game usually ends in round 7-9, so have cpu factor that into their player evaluation metrics. Also, have them evaluate if the game will most likely end earlier or later or make it to round 10 based on the team abilities (eagles) or how many psi vs coins players have come out.
Colts should really avoid any negative every turn players as this will set them back a lot because they can't replace them. They should also target end of round players more since their ability gives the end of round players a boost
Evaluate each teams ability and what the optimal play strategy would be for each team. Then program each team to bid and nominate differently gearing it towards that ability. List each change and geared ability reasoning in the implementation plan before doing the changes
Each team should have their own list of players they want vs don't want as much and how big of a gap there is each auction phase to help them bid on the players they want and not just random players. This shouldn't be an extreme, I don't want Patrick mahomes one of the best players in the game being avoided because it doesn't fit a teams strategy. If a team sees another team bidding on a player for cheap maybe they bid on that player just to raise the price. This comes with risk though that they might win the player so have them factor in how likely it is for the opposing team or other teams to outbid them. For example, the saints love a player like Trevor Lawrence. They can also usually get him for cheap since other teams don't want him as much as the saints would. But maybe I know that the saints would really really want him so I'm willing to outbid them little because I know they are going to outbid me for a little bit because their ability still makes it such a good deal for them.

-------------------
Playtest #19: (Complete)
- Completed / Fixed in Playtest #19:
  1. Lions Ability Fix: Added +N coin grant (N = player count) on first player claimed in a round for both CPU and Human in `resolveAuctionWin`.
  2. Trade Demand Event Redesign: Removed modal popup; event now utilizes seamless 1-card in-grid auction, followed by standard auction without consuming round winner quota.
  3. Bid Meter Auto-Reset: Custom bid snaps to minimum valid bid (`nextBid`) whenever a new card is nominated/active.
  4. Rookie Class Clockwise Rotation: Fixed nomination pass to clockwise team with fewest cards won in `double_draft`.
  5. Vikings 2x Instant Coins: Instant coin acquisition rewards are doubled when PSI < 27.
  6. CPU Ability Notifications: Added floating 1.8s transient toast and top event-bar banner for non-every-round franchise triggers (e.g. Dolphins bailout, Lions bonus, Eagles tush push, Bills discard claim).
  7. Cardinals Draft Curation: Preserves multiple negative drawback cards when rival Saints are present to dilute draft effectiveness.
  8. Smart Middle-Tier Nomination: Out-coined CPUs nominate affordable high-quality middle-tier players rather than unattainable superstars.
  9. Human Worst-Card Protection: CPUs refrain from petty 1-coin outbids on human decoy nominations when better cards are available.
  10. Rolling Slot-Machine Counters: `RollingSlotCounter` animates Coin and PSI badge transitions with `+N` / `-N` badges.
  11. Uniform Fisher-Yates Shuffling: Integrated Fisher-Yates algorithm for setup and era card shuffling.
  12. Dynamic Game End Horizon: Calculated dynamically (Rounds 7–9 vs 10) based on table deflation velocity, closest runaway winner, and Eagles inflation resistance.
  13. Colts Roster Protection: Implemented -50 valuation penalty on recurring negatives to prevent permanent lineup poisoning.
  14. 32-Franchise Strategic CPU AI: Customized valuation weights, strategic archetypes, outbid farming, and rival pass trapping across all 32 NFL franchises.
  ----------------
  Playtest #20: (Complete)
  - Completed / Fixed in Playtest #20:
    1. Bills Discard Validation & Patience: Excluded practice squad cards from Bills discard market (`isGenuinePlayerCard`). In early rounds (R1–3), CPU Bills now hoard their 1-time ability unless a 4-deflate card or elite outlier enters the discard pile (score >= 26), ensuring the power is available for high-impact Phase 2 and HOF players in later rounds.
    2. Falcons Phase Mulligan Usage: Updated Falcons mulligan from once per game to once per phase (Phase 1, Phase 2, Phase 3/HOF), tracking `falconsPhaseUses[currentPhaseKey]`.
    3. Early-Game Bankroll Management: CPUs in Rounds 1–3 maintain a savings reserve (at least 35% of coins or 3 coins min) so they don't blow their entire purse on ordinary Phase 1 players and go broke, preventing players from hoarding coins and dominating later rounds unopposed.
    4. Vikings PSI Under 27 Visual Highlighting: When Vikings have PSI < 27, their team ability card glows with a prominent yellow border, double-coins badge, and pulse animation.
    5. Top Announcement Banners: Added prominent top announcement banners with custom franchise branding:
       - Lions: Amber/gold banner when claiming the 1st card in a round (+N coins).
       - Jets: Emerald green banner with ✈️ when paying max bid and deflating -4 PSI.
       - Raiders: Slate/silver banner with ☠️ when transferring 1 PSI to an opponent.
    6. Isaiah Pacheco Card Modal & EV:
       - Replacement modal now renders the full card preview (name, position, phase, min/max bid, and detailed effects) of the newly drawn card before prompting the human to choose which roster player to cut.
       - Elevated Isaiah Pacheco's base evaluation from 10 to era-scaled deck EV (18 in Phase 1, 28 in Phase 2, 40 in HOF), ensuring CPUs properly prioritize Pacheco over coin-bleed players like Ezekiel Elliott.
    7. Endgame Deflation Escalation & 4-Deflate Superstars:
       - In final 1–2 rounds (or Round 7+), deflation is valued dramatically over coins (1.75x–2.0x deflation weight, coins scaled down).
       - 4-deflate recurring superstars bypass savings reserves, triggering aggressive bidding wars up to 85% of effective max bid in Rounds 5+.
    8. Board Parity Principle (TJ Hockenson scenario): When all or most remaining players on the board are of roughly equal high-tier strength (`cardScore - floorScore <= 3.5`), CPUs recognize that substitute supply meets demand and cap valuations at 1–3 coins instead of entering a wasteful bidding war.
    9. Opportunity Cost & Tier Ranking (Jalen Coker scenario): When superior options (+3 / +4 coins/round or elite deflaters like Drake London or AJ Brown) exist on the board, mid-tier Phase 1 players (e.g. +2 coins/round like Coker, base maxBid <= 8) are capped at 3–4 coins max, preventing CPUs from blowing 6 coins on mid-tier players due to artificial max-bid inflation from events like Overpaid.
    10. Broncos First-Round Ignored Cards: Lineup cards for Broncos whose recurring effects are ignored during their acquisition round are highlighted with a prominent red border, ring, and red glow until after the first refresh summary is confirmed.
    11. Combined & Condensed Current Turn & Bidding Section: Merged the duplicate top turn bar and bidding panel into a single, compact, unified section without redundant turn banners, while preserving `Next CPU action`, `Skip to my turn`, and `Skip to refresh phase`.
    12. Header Layout Alignment: Firmly right-aligned the Active Round Event and Franchise Ability boxes with `justify-end ml-auto`.
----------------
Playtest #21: (Complete)
- Completed / Fixed in Playtest #21:
  1. Buccaneers Copy Seahawks Ability: Immediately grants the 4th Practice Squad player (`ps_${playerId}_3`) to the Buccaneers upon copying the Seahawks ability (both for Human and CPU).
  2. Multi-Team Ability Queue Precedence: When Buccaneers copy a franchise ability (Titans, Raiders, Chiefs, Commanders, Bills, Eagles), the original real franchise acts first, followed by the Buccaneers.
  3. Commanders Multi-Marking: Both the original Commanders and Buccaneers can mark auction players in the pre-auction phase (`commandersMarkedIndices`). First player cannot nominate or bid on any marked player (unless only 1 card remains on the board), and the mark lifts when the first player acquires any player.
  4. Match Controls Vertical Fitting: Removed the redundant "Skip to My Turn" and "Skip to Refresh Phase" buttons from the match controls sidebar to eliminate vertical overflow and cleanly fit the full-width "Next CPU Action ➔" button.
  5. Last Auction Winner Celebration Screen: Fixed auction phase auto-transitioning before player acquisition celebration; `auctionPhase.endIf` now waits for `G.board.cardWonFlyAnimation === null` before proceeding to `postAuctionPhase`.
  6. Refresh Phase Header & 3-Column Layout:
     - Formatted the Refresh Phase table results grid with sleek 3-column desktop layout (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3`) and safe team name fallback.
     - Scoped winner flags, pass tags, and red out-borders to `ctx.phase === 'auctionPhase'`, displaying "Active Roster" during the refresh phase.
     - Streamlined the "Time for the Refresh Phase" popup into a compact modal without verbose flavor text.
  7. Event Reveal Ordering (Rivalry & Trade Rumors):
     - Interactive event modals (Trade Rumors, Free Agency, Rivalry, New Cap Limit) are now gated behind `!isEventFlipped`.
     - Players always see the Event Reveal popup first, requiring them to click "Continue" before interactive event prompts appear.
     - Moved Rivalry step execution into `confirmEventReveal` to prevent premature CPU triggers before the event reveal is acknowledged.
----------
Playtest #22: (Complete)
- Completed / Fixed in Playtest #22:
  1. Event Reveal Popup Continuity: Fixed event reveal popup triggering consistently after team selection and after clicking continue to next round during the refresh phase by maintaining proper phase end conditions and ensuring `eventFlipRevealed = false` on every new round start.
  2. Auction Row Height Optimization & Inspection Modal:
     - Removed redundant auction row top banner and tightened grid gap to fit both player rows on screen without clipping.
     - Formatted cards to display special ability text with 2-line clamping and a ⚡ inspect button.
     - Added full-screen `Inspected Player Card` modal when clicking on any card or the ⚡ icon to review full card stats, costs, position, and unabridged special rules.
     - Moved "ACTIVE" indicator to the bottom right of the card, aligned with the Phase badge.
     - Positioned TURN and INSTANT trigger badges directly adjacent to coin/deflate values.
   3. Compact Auction Row Banner: Added sleek, ultra-compact banner centered above the draft cards (🔨 AUCTION ROW) to clearly identify the auction section without encroaching on player card height.
   4. Dynamic Horizontal Shrinking for Teams & Active Lineup:
      - Top Tier Teams: When 4 teams, no change (min-w-[190px] max-w-[230px] flex-1). When 7 or more teams, dynamically shrinks team cards horizontally (min-w-0 flex-1) with streamlined badges so all 7–10 teams fit cleanly across the row without horizontal scrolling.
      - Active Starting Lineup: 3 cards remain the normal size (min-w-[125px] flex-1). When 4 or more cards (Seahawks, mid-game event card additions, or expansions), dynamically shrinks cards horizontally (min-w-0 flex-1) so all cards fit without scrolling.
      - Colts Infinite Lineup: Excluded from shrinking to preserve readability; lineup remains scrollable (w-[130px] shrink-0 with overflow-x-auto tabletop-scroll) with the most recently acquired player displayed on the left side (index 0).
   5. Trade Rumors Event Continuation Bug: Fixed modal gating logic where isEventFlipped checked ctx.phase === 'eventPhase' unconditionally, which prevented the event reveal popup from closing when clicking Continue and kept the Trade Rumors card-pass modal hidden. isEventFlipped now accurately closes on confirmEventReveal, smoothly displaying the Trade Rumors card selection dialog and advancing to auction.
   6. Special Ability Duplication in Inspect Card Modal: Fixed inspected player card modal showing the special ability description twice. The modal now omits the clamped preview in `renderCardEffects` and keeps the dedicated full unabridged `⚡ Special Ability:` description box at the bottom.
   7. Post-Auction Phase & Refresh Phase Continuation Transition: Fixed bug where completing the auction as the last team to acquire a player (e.g. Eagles) left the center arena blank and header showing "EVENT PHASE" with no button to proceed. 
      - `postAuctionPhase` is now properly designated in the header phase badge ("Post-Auction") and keeps the Auction Row visible rather than rendering an empty black area.
      - Implemented missing franchise ability modals in the Arena UI for Eagles (`pendingEagles`), Bills (`pendingBills`), Raiders, Cardinals, Chiefs, and Commanders.
      - Eagles player can now use their Tush Push ability (1x or 2x) or click "Pass & Proceed to Refresh Phase ➔".
      - Added fallback "Continue to Refresh Phase ➔" button in Match Controls whenever post-auction decisions finish, and added `proceedToRefresh` move in `Game.js` to guarantee smooth transition into the Refresh Phase.
----------
Playtest #23: (Complete)
- Completed / Fixed in Playtest #23:
  1. Quick Player Navigation Arrows on Inspect Modal:
     - Added floating circular chevron navigation arrows (`◀` and `▶`) flanking the left and right sides of the player modal box.
     - Added inline `◀ X/Y ▶` quick-stepper in the modal header and `◀ Prev` / `Next ▶` buttons at the bottom.
     - Added full keyboard arrow key navigation (`ArrowLeft`, `ArrowRight`, `Escape` to close) for fast cycling through available players without closing and reopening the modal.
     - Works seamlessly across all player card sources: auction row, player active starting lineup, and opponent rosters.
  2. Free Agency Event Genuine Player Card Representation:
     - Replaced plain text description container with the genuine in-game player card UI.
     - Displays min/max bid indicators, position tag (QB, RB, WR, TE, K, DEF), era/phase badge, card effects with TURN/INSTANT tags, and dedicated special ability highlight box.
     - Added real-time sign cost and bank balance comparison for both active and waiting player views.
  3. Chargers Ability Banner in Refresh Phase:
     - Integrated Chargers ability into the top banner during the refresh phase (`calculateRefreshResults`).
     - Corrected CPU outbidding tracking so the outbidding franchise (rather than the outbid player) is awarded outbid credits.
     - Posts top banner event and franchise ability notification: `⚡ Chargers Ability: Chargers gained X coins by outbiding opposing teams`.
-----------------
Playtest #24: (Complete)
Let's switch to working on the Mobile version of the game.
Don't allow there to be a desktop view switch when the user is using a phone. Also don't allow the desktop version to have a switch to mobile view. Delete that button and functionality in the game.
On mobile, when trying to edit teams in the Pre-Game Setup, it makes me type the number of teams I want. I would rather there be a button that allows me to alter the teams up or down 1
For mobile, under the my team tab, I like the setup, but it also needs to include the special power of the team I selected
For Auction tab, I need to be able to see the player card like in the desktop. I need to be able to see what each player does. You can probably fit 2 or 3 columns of cards on the screen at once. I think you should still have the selected card for the auction be displayed at the top, just smaller. 
The team icon on the top of the auction tab, when clicked should jump me straight to the My Team tab
Delete the My turn and Refresh buttons. Just have the next cpu action button for mobile

- Completed / Fixed in Playtest #24:
  1. Automatic View Detection & Switcher Removal:
     - Deleted the `🖥️ Desktop View` buttons from Mobile (`MobileDeflategateBoard.jsx`).
     - Deleted the `📱 Mobile View` buttons from both Desktop UIs (`DesktopDeflategateBoardArena.jsx` and `DesktopDeflategateBoardClassic.jsx`).
     - View mode dynamically and automatically matches window width (`<= 768px`) or mobile user agent (`iPhone|iPad|iPod|Android`) with active resize listeners in `App.jsx`.
  2. Pre-Game Setup Steppers:
     - Replaced manual number input fields for Total Teams (4-10) and Human Players (2 to N) with tactile `[−]` and `[+]` button steppers.
     - Added instant min/max bounds checking and visual styling.
  3. Franchise Special Power in "My Team" Tab:
     - Added a dedicated, premium Franchise Hero Card at the top of the "My Team" (`myRoster`) tab.
     - Displays franchise name, icon, full special ability description, coin and deflation balances, and starting lineup slot capacity.
     - If the player is Buccaneers copying another team's power, clearly displays the copied power and "COPIED" badge.
     - Made lineup cards clickable to open the player inspection modal.
  4. Desktop-Style Player Cards in Mobile Auction Tab:
     - Organized the auction prospects pool into a responsive 2 to 3 column grid (`grid grid-cols-2 gap-2 sm:grid-cols-3`).
     - Displays full desktop-parity player card details on mobile: position badge, phase badge, card name, min/max bids, card effects with TURN/INSTANT badges, and special ability preview.
     - Rendered the currently nominated active auction card at the top in a compact format to conserve vertical screen space.
     - Included a full-screen player inspect modal with floating chevron navigation arrows (`◀` and `▶`), header `◀ X/Y ▶` quick-stepper, and bottom prev/next buttons.
  5. Jump to My Team Tab from Header:
     - Made the persistent team icon/vitals card at the top of the mobile screen clickable to jump directly to the "My Team" (`myRoster`) tab.
     - Added visual indicator (`➔`) and subtitle ("Tap to view").
  6. Cleaned Up CPU Action Bar:
     - Removed redundant `My Turn ⏩` and `Refresh ⏩` buttons from the mobile action bar during CPU turns.
     - Replaced with a single prominent, full-width `Next CPU Action ➔` button.
-----------
Playtest #25: (complete)
New cap limit event has two problems, one is that it pops up with a screen for the user to choose the new cap limit for this round. That isn't what it's supposed to do at all. It's supposed to increase all the players in the auction row's max bid by 4. Not sure why the user is picking how much they want it increased. Second, there is no event notification pop up saying the new cap limit event is the event this round, it just goes to the other screen where the user chooses the cap limit instead. Also the game gets stuck at the screen and doesn't allow me to continue when I click
In the teams section when I click on a team. Delete the lineup slots and per round gain boxes, no need for them.
Also delete the per round effect symbol and description that is right to the right of the active lineup description
When looking at a team in the teams section, allow the user to be able to swipe to the left or right to navigate to the next team. Also allow the user to swipe left or right to navigate to a new tab when they are in a tab but not looking at the full details of a team. Also, allow the user to swipe when they click into a player in the auction tab. So they can scroll through the players that way. Also works in the my team and teams tab when they are looking at the player cards of a team. Have it scroll through the players in the active lineup when the user swipes
In the my team tab, delete the starting lineup capacity description
The event name is labeled in the top right side of all screens right now. Allow the user to click it to see what the current event is and the description of that event
The top of the screen says rounds 1/9 when it should be rounds 1/10
---------
Playtest #26: (complete)
When I click into the teams tab and then click on a team, I want to change the UI a little. Under the name of the team, I want the 2/4 designation to be to the right of the team and no longer have the arrows to the left and right of it. Just the "3/4" no arrows. You can also delete "Full Roster & Franchise Overview" text below the team name. Maybe make the football icon smaller as well. Now condense the extra space created by deleting those things. So that we can see the first three active lineup spots fully. I think we can condense the Franchise power a little and if more is needed the Deflation and coins boxes. 
Only have the event banner and the user team's box at the top displayed in the auction tab. Other tabs don't need those displayed. Change the event banner to be only one line, include the Team on the left and then the start of the message in the middle all the way to the right. Delete the Newer/older boxes and the 1 of 3 description. And no need for a X box on the top right. When the user clicks on the banner they will pull up a UI that shows them all the banner messages and the full banner messages, not just the start of them, they can scroll through them all. Don't delete older messages, all the messages for the game can be scrolled through and also designate which round they happened in this view.
When bidding on a player, the bid button is a little long compared to the other buttons. Lets make the pass and Max (X) a little longer, the arrows to alter the bid up or down larger and make the Bid X button smaller (should still be the largest button). 
--------------
Playtest #27 (complete)
All for mobile:
The first round has the event effect happen before the event revealed. This was for Free Agency event. Fix it for this situation and check to see if this happens in all the rounds or for all the events
Delete the i icon to the right of the event name
When I am on the player card details in the auction tab, My team tab, or teams tab allow me to swipe left or right to move to the next player. Allow me to swipe anywhere on the screen in order to do this. 
When I am on the player card details in the auction tab, my team tab, or teams tab. Remove the arrows to the left and right of the card. Because we have the next prev buttons at the bottom we don't need it
I saw that the bucs chose the Denver team to copy at the start of the game when they were the CPU. This should never happen, the Broncos have a negative ability. Almost any other ability would be better. Introduce logic for the CPU when they select a team ability to copy so they target the best ones. Usually the better ones have lower starting coins and higher starting PSI. Add a little bit of randomness, so they don't pick the same one everytime but they should never pick the negative ones. Not much randomness though. 
In the Auction tab, keep the player card UI the same way. In the my team and teams tab, change the player card UI so that the player name is displayed right to the right of the WR/QB/position designation. This will save room so that there isn't a gull line for the player name. Again, keep it how it is in the auction tab though. 
In the my team tab, have the special ability box outlined. 
In the teams tab, when I click on a team, the PSI is overlapping to a new line. Alter the Deflation box so it's bigger and the coins box is smaller. 
On mobile, when the auction phase is over it doesn't go to the next phase/the refresh phase. When the last player is acquired in the auction, make the "Next CPU action" button and the Awaiting nomination box disappear and add a Proceed to the refresh phase button and screen where the auction phase was. Also make sure that after the user clicks on the proceed to the refresh phase button have the game show the refresh phase update for each team on the auction tab that is similar to the desktop version but fitted for the mobile display. then have a the "Next CPU Action" reappear but say "Proceed to Next Round".
------------
Playtest #28: (complete)
All for mobile:
When I am the Cardinals, I cannot see the details of each player card when I am selecting the player to switch out. Lets add the player cards to the UI screen that pops up. I want to see the following details (Min/Max, Everyturn/instant effects, Name, position, phase). Have the UI be concerent with how the normal player card looks in the auction tab. 
I am finding that when I click " Next CPU Action" over and over I misclick when it goes to bid/pass/max bid. Also when a player gets acquired I can misclick and nominate someone I don't want to. Add a freeze time period that prevents misclicks in these two situations
When I go to the teams tab in the middle of the auction phase, I should be able to see which teams have acquired a player already and are out of the bidding. They should be highlighted in red
When a player is acquired in the auction, have a popup like the desktop version that shows who won and for how many coins.
I like the refresh phase to have the team icons have two columns so not each team is taking up a whole row of their own. Two columns. 
------------
Playtest #29:
Starting Screen Redesign: (Desktop & Mobile)
1. Desktop Layout Option Removed:
   - Fully removed the "Desktop Layout" option (Arena vs Classic) from the setup screen.
   - Arena view is now permanent for all desktop sessions.
   - Deleted `DesktopDeflategateBoardClassic.jsx` and removed all Classic layout toggle logic.
2. Game Mode Selection (Only 2 Options):
   - "vs CPU (Solo)": Single player against CPU opponents.
   - "Play with Friends": Multiplayer where human players can join, and all remaining unfilled spots up to Total Teams automatically fill with CPU opponents.
3. How to Play Button Outline:
   - Styled the "How to Play & Rules Guide" button with an iconic UNC Charlotte / Carolina Blue border (`border-2 border-[#4B9CD3] hover:border-[#7BAFD4] text-[#93c5fd] bg-[#4B9CD3]/10`), replacing the previous outline.
   - Removed the collapsible local Wi-Fi connection guide since Render cloud hosting allows friends on different Wi-Fi networks to connect seamlessly via the public URL without local network configuration.
4. CPU Difficulty Selector (4 Options in 1 Column):
   - Added a dedicated CPU difficulty button with a vertical 1-column list of four options: "Easy", "Normal" (default), "Hard", and "Extreme".
   - Wired `cpuDifficulty` into game setup data and initial state for future AI difficulty behaviors.
------------
Playtest #30:
Evolutionary Algorithm (Genetic Self-Play Optimization) & League Franchise Balance:

1. Architecture & Luck Mitigation Methodology:
   - Built a headless simulation engine in `scripts/optimize_team_ai.mjs` running full 10-round games in ~400ms (4P) to 1.6s (8P).
   - Mitigated card/event RNG luck using **Matched Duplicate Seed Replays**: for every candidate genome tested, the engine runs Game A (Candidate) and Game B (Baseline) on identical PRNG seeds (identical card draw order, identical event cards, identical opponent seat assignments). This guarantees that any difference in final PSI ($\Delta\text{PSI}$) or win rate is 100% due to AI strategic decisions rather than luck.
   - Tested candidates across 4-Player, 6-Player, and 8-Player tables to capture table density dynamics.

2. Franchise-by-Franchise Evolutionary Observations:
   - **Cleveland Browns (45 Starting PSI, 20 Starting Coins, 0 Coins Gainable)**:
     - *Benchmark*: 0.0% Win Rate, 8.8 Avg PSI.
     - *Evolved Outcome*: **66.7% Win Rate**, **2.2 Avg PSI** (+6.6 PSI improvement).
     - *What the AI Learned*: Increased `reserveCoins` from 5 to 6, increased `deflateWeight` to 3.64, and reduced `priceBumpProb` from 0.10 to 0.06. Because the Browns can never earn coins back, price-bumping opponents was accidentally sticking the Browns with unwanted cards that drained their purse. By saving coins strictly for high-impact deflation cards, the Browns' win rate jumped to 100% in 4P games and 50% in 6P/8P games.
   - **Indianapolis Colts (50 Starting PSI, Infinite Lineup Capacity)**:
     - *Benchmark*: 83.3% Win Rate, 3.7 Avg PSI.
     - *Evolved Outcome*: **66.7% Win Rate**, **3.2 Avg PSI** (and a league-best **1.0 Avg PSI** in the balance tournament).
     - *What the AI Learned*: Maximized `recurringMult` to 2.00, keeping `deflateWeight` at 2.00 and `synergyBonus` at 1.60 with 0-1 coin reserve. The Colts never replace cards, so recurring coin and deflation engines stack exponentially. The AI strictly avoids recurring negative cards (which would otherwise permanently cripple the franchise).
   - **Miami Dolphins (End-of-Round 3-Coin Bailout if at 0 Coins)**:
     - *Benchmark*: 33.3% Win Rate, 8.7 Avg PSI.
     - *Evolved Outcome*: **50.0% Win Rate**, **4.3 Avg PSI** (+5.5 PSI advantage over baseline).
     - *What the AI Learned*: Lowered `coinWeight` to 0.52 and locked `reserveCoins` to 0 with high `aggression` (1.30). Because hitting 0 coins triggers an automatic +3 coin cash injection every single round, hoarding coins was suboptimal. The AI learned to spend down to 0 aggressively to win premium cards and rely on the bailout.
   - **Chicago Bears (+2 Coin Outbid Requirement for Opponents)**:
     - *Benchmark*: 0.0% Win Rate, 15.7 Avg PSI.
     - *Evolved Outcome*: Peak **83.3% Win Rate** (Gen 2) and **66.7% Win Rate** (Gen 3), Avg PSI dropping from 15.7 to **1.2 - 7.2**.
     - *What the AI Learned*: Bumping `deflateWeight` to 2.01 and increasing `priceBumpProb` to 0.43. The Bears' +2 outbid penalty forces opponents to bleed 2 extra coins whenever they contest the Bears. In 8-player tables, the Bears achieved a **100% win rate** because table-wide bidding wars drained everyone else's banks, allowing the Bears to scoop cards cheaply.
   - **Philadelphia Eagles (Tush Push Post-Auction Table Deflation)**:
     - *Benchmark*: 16.7% Win Rate, 12.2 Avg PSI.
     - *Evolved Outcome*: **33.3% Win Rate**, **8.7 Avg PSI** (100% Win Rate in 4P tables).
     - *What the AI Learned*: Kept `reserveCoins` at 6 and `coinWeight` at 1.50. The Tush Push converts coins into table-wide deflation; without a deep coin reserve, the ability cannot fire effectively. Scales best in 4P tables where deflation directly pressures the small field.
   - **Houston Texans (+2 Coins / +2 Deflate per QB in Refresh Phase)**:
     - *Benchmark*: 33.3% Win Rate, 18.0 Avg PSI.
     - *Evolved Outcome*: **50.0% Win Rate**, **3.3 Avg PSI** (+3.8 PSI advantage over baseline).
     - *What the AI Learned*: Raised `synergyBonus` to 1.90, `coinWeight` to 1.60, and dropped `reserveCoins` to 0. The AI goes all-in on acquiring QBs. Achieved a **100% win rate in 4P tables** where QBs are readily available, but struggled in 8P (0%) where high player count dilutes QB availability.
   - **New England Patriots (Starts with League-Lowest 36 PSI, 7 Starting Coins)**:
     - *Benchmark*: 33.3% Win Rate, 8.3 Avg PSI.
     - *Evolved Outcome*: **83.3% Win Rate**, **1.8 Avg PSI** (36.4% Win Rate across 11 tournament games).
     - *What the AI Learned*: Lowered `recurringMult` to 0.41 while maintaining high `deflateWeight` (2.31) and high `synergyBonus` (1.65). Because the Patriots start at only 36 PSI (a massive 6–14 PSI head start over rivals at 42–50 PSI) with a moderate 7-coin purse, waiting for slow multi-round recurring engines is unnecessary; the AI learned that snapping up immediate instant deflation cards lets them sprint directly to 0 PSI before opponents can build up their engines.
   - **Green Bay Packers (All-Phase-1 Cards Bonus: +3 Deflate/Round)**:
     - *Benchmark*: 16.7% Win Rate, 13.5 Avg PSI.
     - *Evolved Outcome*: **50.0% Win Rate**, **5.5 Avg PSI** (+2.8 PSI advantage over baseline).
     - *What the AI Learned*: Reduced `aggression` to 0.94 and locked `reserveCoins` to 0. In 8-player games (where it achieved **100% win rate**), opponents fight fiercely over expensive Phase 2 and HOF cards; the Packers quietly accumulated cheap Phase 1 players, keeping their +3 deflate/round engine untouched.

3. 45-Game League Balance Tournament Results (Across 4P, 6P, and 8P Tables):
   - **Tier 1 (Front-Runners / Highly Dominant)**:
     - Bills: 50.0% Win Rate (6.5 Avg PSI) — Dominates 4P (67%) and 6P (100%).
     - Colts: 50.0% Win Rate (1.0 Avg PSI) — Exceptional endgame deflation engine.
     - Patriots: 36.4% Win Rate (3.7 Avg PSI) — Consistent across 6P (40%) and 8P (40%).
     - Titans: 33.3% Win Rate (4.8 Avg PSI) — Strong in 8P (50%).
   - **Tier 2 (Solid Contenders / Table-Dependent)**:
     - Eagles: 27.3% Win Rate (8.2 Avg PSI) — Dominant in 4P (100%), diluted in 8P (20%).
     - Raiders: 25.0% Win Rate (5.5 Avg PSI) — Strong in 6P (50%).
     - Chiefs: 25.0% Win Rate (10.9 Avg PSI) — Strong in 6P (50%).
     - Ravens: 23.5% Win Rate (9.9 Avg PSI) — Consistent across 4P (20%), 6P (20%), 8P (29%).
     - Steelers: 20.0% Win Rate (8.6 Avg PSI) — Strong in 6P (50%).
     - Cardinals: 20.0% Win Rate (9.2 Avg PSI) — Strong in 8P (33%).
     - Bears: Evolved champion achieved 83.3% candidate win rate, specifically dominating 8P tables (100%).
   - **Tier 3 (Underperforming / High Variance)**:
     - Browns: 15.4% Win Rate (7.8 Avg PSI) — Substantially improved from 0% baseline, but zero coin replenishment remains unforgiving when bad events hit.
     - 49ers: 16.7% Win Rate (13.0 Avg PSI) — Needs tighter threshold tuning for luxury tax avoidance.
     - Chargers: 16.7% Win Rate (15.2 Avg PSI) — Opponents actively counter-play by sticking them with unwanted cards.

4. Implementation:
   - Generated evolved weights saved to `src/ai/team_weights.json`.
   - Exported `EVOLVED_TEAM_GENOMES` via `src/ai/evolvedWeights.js`.
   - Wired `ACTIVE_TEAM_GENOMES` directly into `src/Game.js` (`scoreCardForPlayer` and `evaluateCpuAuctionBid`), ensuring all solo and multiplayer matches automatically utilize the optimized AI strategies.
Playtest #31:
Full League Deep Evolutionary Optimization (23 Remaining Teams in 4P, 7P, and 10P Tables):

1. Setup & Testing Formats:
   - Evaluated the remaining 23 franchises (`bills`, `jets`, `ravens`, `bengals`, `steelers`, `jaguars`, `titans`, `broncos`, `chiefs`, `raiders`, `chargers`, `cowboys`, `commanders`, `lions`, `vikings`, `falcons`, `saints`, `panthers`, `buccaneers`, `cardinals`, `rams`, `49ers`, `seahawks`) while preserving the 8 previously trained genomes.
   - Evaluated every candidate across **4-Player, 7-Player, and 10-Player tables** using paired duplicate seeds (Game A vs Game B on identical shuffles).
   - Each candidate played 12 games per evaluation (4 games in 4P, 4 games in 7P, 4 games in 10P), with each team playing 60+ games throughout the evolutionary cycle.

2. Key Franchise Observations & Evolved Behaviors:
   - **New Orleans Saints (Immune to Negative Coins & Inflation)**:
     - *Tournament Result*: **45.5% Win Rate** (5/11), **3.1 Avg PSI** (Dominant across 4P at 100% and 10P at 43%).
     - *Weights*: Deflate=1.80, Coin=1.00, Recurr=1.29, Aggr=1.00, Reserve=3, Bump=0.20, Synergy=1.40.
     - *Observation*: Saints exploit drawback cards with zero penalty. Cards that penalize coins or inflate rivals are huge bargains for New Orleans, making them one of the league's most consistent top-tier performers across all table sizes.
   - **San Francisco 49ers (Double Deflation when < 5 Coins in Refresh Phase)**:
     - *Candidate Evaluation*: **83.3% Win Rate**, **1.0 Avg Final PSI** (100% Win Rate in 4P and 10P).
     - *Weights*: Deflate=1.19, Coin=0.60, Recurr=1.33, Aggr=1.30, Reserve=0, Bump=0.22, Synergy=1.24.
     - *Observation*: The AI learned to drop `reserveCoins` strictly to 0 and reduce coin valuation to 0.60. By spending down below 5 coins every auction, the 49ers trigger continuous double deflation every round.
   - **Seattle Seahawks (Starts with 4 Practice Squad Players / 4 Roster Slots)**:
     - *Candidate Evaluation*: **83.3% Win Rate**, **2.5 Avg Final PSI** (100% in 4P and 7P).
     - *Weights*: Deflate=2.11, Coin=1.20, Recurr=1.30, Aggr=1.11, Reserve=2, Bump=0.20, Synergy=1.04.
     - *Observation*: With 4 roster slots instead of 3, Seattle's cumulative recurring effect multiplier (`recurringMult = 1.30`) and high deflation weight (`deflateWeight = 2.11`) allow them to build a 4-player engine that outpaces 3-slot rivals.
   - **Dallas Cowboys (Gain 2 Coins at End of Every Round)**:
     - *Candidate Evaluation*: **50.0% Win Rate**, **3.3 Avg Final PSI** (100% in 4P, 50% in 7P).
     - *Weights*: Deflate=1.80, Coin=0.47, Recurr=1.17, Aggr=1.20, Reserve=0, Bump=0.20, Synergy=1.20.
     - *Observation*: Because 2 coins replenish passively every single round, hoarding coins is suboptimal. The AI reduced `coinWeight` to 0.47 and kept 0 reserve, maximizing aggressive bidding during auctions.
   - **Detroit Lions (First Player to Claim Gains Coins Equal to Player Count)**:
     - *Tournament Result*: **22.2% Win Rate** (100% Win Rate in 4P).
     - *Weights*: Deflate=1.70, Coin=0.96, Recurr=0.61, Aggr=1.30, Reserve=1, Bump=0.20, Synergy=1.73.
     - *Observation*: High aggression (1.30) and low reserve (1) ensure the Lions strike first during nomination, immediately claiming the coin bonus equal to table size.
   - **Minnesota Vikings (If < 27 PSI, Players Generate 2x Coins)**:
     - *Tournament Result*: **40.0% Win Rate** (4/10), 12.1 Avg PSI (75% Win Rate in 4P).
     - *Weights*: Deflate=1.80, Coin=1.65, Recurr=1.00, Aggr=1.00, Reserve=2, Bump=0.20, Synergy=1.30.
     - *Observation*: High coin valuation (1.65) enables Vikings to amass extreme coin totals once below 27 PSI, buying out late-game HOF superstars.
   - **Pittsburgh Steelers (If Richest Player at Start of Round, Give Opponents 1 PSI)**:
     - *Weights*: Deflate=1.40, Coin=1.44, Recurr=1.00, Aggr=0.90, Reserve=7, Bump=0.23, Synergy=1.30.
     - *Observation*: The AI evolved a deep 7-coin savings reserve (`reserveCoins = 7`) and cool aggression (0.90) to stay wealthier than opponents and trigger round-start inflation penalties on rivals.
   - **Cincinnati Bengals (+2 Coins/Deflate on Instant Abilities)**:
     - *Weights*: Deflate=2.29, Coin=1.50, Recurr=1.05, Aggr=0.85, Reserve=2, Bump=0.25, Synergy=1.64.
     - *Observation*: Extremely high `deflateWeight` (2.29) and high `synergyBonus` (1.64) prioritizing instant-effect players.

3. 45-Game Multi-Format Tournament Leaderboard (4P, 7P, and 10P Tables):
   - **Tier 1 (40% - 45.5% Win Rate)**:
     - **Browns**: 45.5% Win Rate (4.8 Avg PSI) — 100% in 4P, 33% in 7P, 33% in 10P.
     - **Saints**: 45.5% Win Rate (3.1 Avg PSI) — 100% in 4P, 33% in 7P, 43% in 10P.
     - **Vikings**: 40.0% Win Rate (12.1 Avg PSI) — 75% in 4P, 25% in 7P.
   - **Tier 2 (20% - 30% Win Rate)**:
     - **Dolphins**: 28.6% Win Rate (9.4 Avg PSI) — Consistent across table sizes.
     - **Jets**: 25.0% Win Rate (7.2 Avg PSI) — 50% in 7P.
     - **Texans**: 25.0% Win Rate (10.8 Avg PSI) — 33% in 10P.
     - **49ers**: 25.0% Win Rate (7.1 Avg PSI) — 33% in 4P, 25% in 7P.
     - **Lions**: 22.2% Win Rate (11.6 Avg PSI) — 100% in 4P.
     - **Panthers**: 20.0% Win Rate (4.6 Avg PSI) — 33% in 7P.
     - **Seahawks**: 20.0% Win Rate (7.2 Avg PSI) — 67% in 4P.
     - **Falcons**: 20.0% Win Rate (17.6 Avg PSI) — 50% in 10P.
     - **Colts**: 20.0% Win Rate (14.4 Avg PSI) — 100% in 7P.
   - **Tier 3 (Underperforming in Large Tables / Needing Balance Tweaks)**:
     - **Broncos (0% in 24 appearances)**: 20 starting coins but ability only ignores drawbacks on the first refresh, leaving them with mediocre late-game engine scaling.
     - **Bills (0% in 8 appearances)**: 1-time discard pickup is too weak in fast 7P/10P games.
     - **Steelers (0% in 12 appearances)**: Hoarding coins to stay richest starves them of board presence in high-player tables.

4. Implementation:
   - All 31 franchises now have custom evolved genomes stored in `src/ai/team_weights.json` and `src/ai/evolvedWeights.js`.
   - All weights are active in live gameplay across solo and multiplayer modes.
Playtest #32:
Franchise Abilities Code Audit & Dynamic Behavioral Weights Optimization:

1. Comprehensive Abilities Code Audit:
   - **League Scope**: All 31 teams in the game audited (Note: The 32nd NFL team, NY Giants, does not exist in `src/GameData.js`).
   - **Critical Bug Fixes & Omissions Found**:
     - **Los Angeles Rams (Once per game, attach 2x token to a non-Phase 1 player)**:
       - *Audit Finding*: The 2x token mechanic existed in the engine (`ramsApplyDoubleToken`), but **zero CPU automation logic existed**! CPU Rams never attached their token in any game, leading directly to their 0% tournament win rate.
       - *Fix*: Added CPU automation in `postAuctionPhase` (and `preAuctionPhase`) that detects non-Phase 1 players in Round 4+, evaluates recurring deflation and income, and attaches the 2x token to their most lucrative engine. Synchronized `ramsDoubleToken` and `ramsMultiplier` flags and added a direct `+2x Token` UI button for human players.
     - **Buffalo Bills (Pay Minimum cost for a player in discard pile once per game)**:
       - *Audit Finding*: Discard pickup threshold was set to `minThreshold = 26` (Rounds 1-3), `20` (Rounds 4-6), `14` (Rounds 7+). Because genuine card scores typically range from 8-16, CPU Bills almost never triggered their ability before games concluded in 4-6 rounds.
       - *Fix*: Calibrated thresholds to `14` (Rounds 1-3), `10` (Rounds 4-5), `6` (Rounds 6+), ensuring Bills actively rescues discarded gems.
     - **Kansas City Chiefs (Pay Minimum cost without bidding once per game)**:
       - *Audit Finding*: Strictly required `round >= 4` AND a card with `deflate >= 3`. In fast 7P/10P games, games often concluded before any such card appeared, leaving Chiefs with an unused ability.
       - *Fix*: Replaced rigid checks with adaptive scoring: scores all affordable board cards, claiming if score $\ge 15$ in Round 3, $\ge 11$ (or $\ge 2$ deflate) in Round 4, or $\ge 7$ in Round 5+.
     - **Denver Broncos (Ignore every turn abilities on the first refresh after purchase)**:
       - *Audit Confirmation*: Confirmed as 100% intentional and as designed by user directive (suppresses both positive and negative recurring effects for exactly 1 turn after acquisition).

2. Dynamic Franchise Behavioral Weights & Rules:
   - **New York Jets (-4 PSI Deflation on Paying Maximum Cost)**:
     - *Immediate Max-Bid Jumping*: If Jets' total valuation of a card + the -4 PSI deflation exceeds `effMax` and Jets can afford `effMax`, Jets now **immediately jumps straight to max price** (`bidAmount = effMax`), locking in the player and triggering the -4 PSI deflation instantly rather than risking incremental $+1$ bidding wars.
     - *Max-Price Efficiency Scoring*: Evaluates player ability value relative to max price cost (e.g. low max-cost cards with 4-8 max bids give unmatched -4 deflation ROI).
   - **Detroit Lions (First Player to Claim Gains Coins Equal to Player Count)**:
     - *Dynamic Aggression*: Added `firstClaimAggression = 1.50` when `isFirstPlayerOfRound` is true to secure the massive player-count coin bounty. Once any team claims a player in the round, aggression drops to `postClaimAggression = 0.85` (slightly less aggressive than normal) to conserve purse funds for the next round's first claim.
   - **San Francisco 49ers (Double Deflation when Coins < 5 in Refresh)**:
     - *Sub-5 Coin Urgency*: When holding $\ge 5$ coins with recurring deflation in lineup, valuation is dynamically boosted to spend down below 5 coins during auctions, actively triggering double deflation during refresh.
   - **Pittsburgh Steelers (Give All Opponents +1 PSI if Richest at Round Start)**:
     - *Adaptive Purse Lead Buffer*: Maintains a savings reserve buffer equal to the richest opponent's purse only when holding or within 1 coin of the richest lead; avoids unproductive hoarding when trailing behind.
   - **Chicago Bears (Opponents Must Outbid by 2 Coins Instead of 1)**:
     - *Table-Scaled Price Bumping*: Scaled `priceBumpProb` with table size (0.20 at 4P, 0.35 at 7P, 0.50 at 8P+) to exploit the devastating 2-coin penalty against large fields.
   - **Miami Dolphins (Gain 3 Coins Whenever Reaching 0 Coins)**:
     - *Zero-Reserve Aggression*: Bids down to 0 coins fearlessly when at 1-2 coins, taking advantage of the instant +3 bailout.
   - **All 31 Franchises**:
     - Expanded `doesCardFitTeamStrategy` and `scoreCardForPlayer` to cover every team in the game (Texans QB synergy, Packers Phase 1 purity, Saints drawback immunity, Bengals instant synergy, Ravens 3-position diversity, Colts unlimited volume, Vikings <27 PSI deflation pivot, etc.).

3. Multi-Format Simulation Results (4P, 7P, and 10P Tables):
   - **4-Player Tables**: 49ers (50%), Jets (20%), Lions (20%), Rams (10%). (Rams won their first games after CPU token attachment fix; Jets secured 20% with max-bid jumping).
   - **7-Player Tables**: 49ers (45%), Chiefs (25%), Jets (20%), Lions (5%), Steelers (5%). (Chiefs and Jets surged with adaptive claims and max-bid triggers).
   - **10-Player Tables**: 49ers (35%), Chiefs (20%), Browns (20%), Jets (5%), Lions (5%), Steelers (5%), Bills (5%), Patriots (5%). (Bills secured wins with calibrated discard threshold).
------------
Playtest #33:
Deep Evolutionary Algorithm Optimization (Round 2) & Definitive 31-Franchise Tier List:

1. Overview & Workload:
   - **Full League Optimization**: Comprehensive deep evolutionary self-play training across all 31 franchises in Deflategate.
   - **Massive Data Volume (11,544 Games Total)**:
     - **Evolutionary Training Phase**: 3 generations $\times$ 4 candidate genomes $\times$ 18 matched seed evaluations $\times$ 2 duplicate games = **324 games per team** (totaling **10,044 evolutionary games** across 4P, 7P, and 10P tables, exceeding the 100 games/team requirement by over 3x).
     - **Post-Optimization League Balance Tournament**: 1,500 games (500 games on 4-Player, 500 on 7-Player, 500 on 10-Player tables) testing all 31 teams with perfected weights across 10,500 player appearances (~340 tournament games per team).
   - **Deterministic Luck Mitigation**: Matched duplicate seeds (Mulberry32 PRNG) comparing each evolved candidate against the baseline on identical card draws, event sequences, and table compositions.

2. New Weight Values & Genetic Behavioral Parameters:
   - `firstClaimAggression` (range 0.80 to 2.50): Governs eagerness to win the first auction claim of each round. Vital for the Lions (+N coins bonus) and early tempo controllers.
   - `postClaimAggression` (range 0.50 to 1.50): Aggression multiplier after the round's first claim is claimed, preventing overspending once claim bonuses expire.
   - `sub5UrgencyBonus` (range 0.0 to 5.0): Extra valuation boost for the 49ers to spend down below 5 coins to trigger double deflation during refresh.
   - `richestBuffer` (range 0 to 6): Margin of coin lead maintained by the Steelers above the richest opponent to protect their start-of-round +1 PSI league penalty.
   - `instantMaxBidAggression` (range 0.50 to 2.50): Multiplier on Jets' willingness to execute immediate max-bid buyouts to trigger instant -4 PSI deflation.

3. Franchise Evolutionary Progression (All 31 Teams):
   | Team | Base Win% -> Opt Win% | Base Avg PSI -> Opt Avg PSI | Perfected Weights & Key Adaptations |
   | :--- | :---: | :---: | :--- |
   | **Bears** | 27.8% -> 55.6% (+27.8%) | 28.2 -> 24.0 (-4.2) | Defl=2.12, Coin=1.16, Recurr=1.00, Aggr=1.20, Resv=2, Bump=0.39, Syn=1.30. Exploits 2-coin outbid penalty; high deflation focus. |
   | **Packers** | 27.8% -> 55.6% (+27.8%) | 29.5 -> 25.9 (-3.6) | Defl=1.61, Coin=1.00, Recurr=1.00, Aggr=1.05, Resv=2, Bump=0.11, Syn=1.40. Prioritizes Phase 1 purity to trigger +4 PSI refresh burst. |
   | **Saints** | 55.6% -> 55.6% (Consistent) | 24.6 -> 24.2 (-0.4) | Defl=1.95, Coin=1.00, Recurr=1.00, Aggr=1.14, Resv=4, Bump=0.14, Syn=1.66. Complete sabotage immunity; high synergy with negative cards. |
   | **Cardinals** | 50.0% -> 55.6% (+5.6%) | 23.6 -> 24.9 (+1.3) | Defl=2.09, Coin=1.00, Recurr=1.00, Aggr=1.00, Resv=2, Bump=0.12, Syn=0.97. Aggressive pre-auction deck curation swaps in elite deflaters. |
   | **Browns** | 33.3% -> 50.0% (+16.7%) | 27.5 -> 25.7 (-1.8) | Defl=3.50, Coin=0.00, Recurr=1.00, Aggr=1.00, Resv=5, Bump=0.17, Syn=1.71. Pure deflation orientation; bankrolls Round 5 +30 coins explosion. |
   | **49ers** | 27.8% -> 50.0% (+22.2%) | 28.0 -> 25.0 (-3.0) | Defl=2.09, Coin=0.93, Recurr=1.10, Aggr=1.49, Resv=0, Bump=0.28, Syn=1.62. Sub-5 coin spending sprint triggers double deflation refresh. |
   | **Patriots** | 44.4% -> 50.0% (+5.6%) | 25.2 -> 24.2 (-1.0) | Defl=2.40, Coin=0.60, Recurr=1.00, Aggr=1.20, Resv=1, Bump=0.20, Syn=1.40. Dominates early tempo using 7 starting coins advantage. |
   | **Jaguars** | 33.3% -> 44.4% (+11.1%) | 27.5 -> 26.1 (-1.4) | Defl=1.48, Coin=1.00, Recurr=1.00, Aggr=1.14, Resv=4, Bump=0.33, Syn=1.02. Secret event deck preview allows strategic phase timing. |
   | **Cowboys** | 27.8% -> 44.4% (+16.6%) | 28.8 -> 29.4 (+0.6) | Defl=1.80, Coin=0.70, Recurr=1.10, Aggr=1.28, Resv=0, Bump=0.15, Syn=1.45. Aggressive purse spending supported by +2 coins passive per round. |
   | **Dolphins** | 11.1% -> 38.9% (+27.8%) | 33.6 -> 26.9 (-6.7) | Defl=1.70, Coin=0.80, Recurr=1.10, Aggr=1.30, Resv=0, Bump=0.20, Syn=1.06. Zero-reserve bidding triggers emergency +3 coin bailouts. |
   | **Ravens** | 27.8% -> 38.9% (+11.1%) | 27.2 -> 25.4 (-1.8) | Defl=1.87, Coin=1.10, Recurr=1.00, Aggr=0.84, Resv=3, Bump=0.24, Syn=1.30. Targets 3-position lineup diversity for +3 coins refresh engine. |
   | **Eagles** | 22.2% -> 38.9% (+16.7%) | 25.7 -> 26.2 (+0.5) | Defl=1.50, Coin=1.50, Recurr=1.00, Aggr=1.00, Resv=6, Bump=0.30, Syn=1.11. Coin hoarding fuels multi-activation Tush Push inflation. |
   | **Vikings** | 22.2% -> 38.9% (+16.7%) | 29.6 -> 26.8 (-2.8) | Defl=1.80, Coin=1.30, Recurr=1.00, Aggr=0.91, Resv=4, Bump=0.20, Syn=1.30. Double-coin refresh threshold under 27 PSI accelerates endgame. |
   | **Bills** | 22.2% -> 33.3% (+11.1%) | 31.5 -> 30.9 (-0.6) | Defl=1.12, Coin=1.00, Recurr=1.00, Aggr=0.84, Resv=4, Bump=0.28, Syn=1.20. Calibrated discard rescue (14/10/6) secures late-game gems. |
   | **Bengals** | 11.1% -> 33.3% (+22.2%) | 34.1 -> 28.3 (-5.8) | Defl=1.80, Coin=0.97, Recurr=0.58, Aggr=0.90, Resv=2, Bump=0.25, Syn=1.39. Leverages +2 instant bonus to cycle cheap instant-effect cards. |
   | **Broncos** | 11.1% -> 33.3% (+22.2%) | 27.5 -> 30.4 (+2.9) | Defl=1.60, Coin=1.00, Recurr=1.00, Aggr=0.99, Resv=4, Bump=0.14, Syn=1.17. High 20 starting coins allows patient acquisition. |
   | **Panthers** | 33.3% -> 33.3% (Consistent) | 30.2 -> 27.3 (-2.9) | Defl=2.36, Coin=0.90, Recurr=1.00, Aggr=0.84, Resv=3, Bump=0.20, Syn=1.20. Passive -2 PSI/round guarantees steady countdown. |
   | **Buccaneers** | 22.2% -> 33.3% (+11.1%) | 28.1 -> 27.1 (-1.0) | Defl=1.66, Coin=1.00, Recurr=1.00, Aggr=1.10, Resv=3, Bump=0.25, Syn=1.30. Smart copy targeting avoids negative abilities. |
   | **Seahawks** | 16.7% -> 33.3% (+16.6%) | 33.1 -> 27.5 (-5.6) | Defl=1.60, Coin=1.00, Recurr=1.15, Aggr=1.00, Resv=2, Bump=0.24, Syn=1.30. 4-player lineup capacity provides superior engine stacking. |
   | **Chiefs** | 33.3% -> 27.8% (-5.5%) | 25.3 -> 26.7 (+1.4) | Defl=1.70, Coin=1.00, Recurr=1.00, Aggr=1.20, Resv=2, Bump=0.21, Syn=1.40. Adaptive pre-auction free claim targets high-impact engines. |
   | **Raiders** | 22.2% -> 27.8% (+5.6%) | 29.3 -> 26.9 (-2.4) | Defl=1.80, Coin=1.00, Recurr=1.00, Aggr=1.10, Resv=4, Bump=0.39, Syn=1.30. Menace ability selectively taxes runaway table leaders. |
   | **Jets** | 11.1% -> 27.8% (+16.7%) | 28.0 -> 26.1 (-1.9) | Defl=1.80, Coin=1.00, Recurr=1.00, Aggr=1.20, Resv=1, Bump=0.20, Syn=1.40. Immediate max-bid jumping triggers instant -4 PSI burst. |
   | **Commanders** | 5.6% -> 27.8% (+22.2%) | 34.0 -> 31.6 (-2.4) | Defl=1.60, Coin=1.00, Recurr=1.00, Aggr=1.00, Resv=3, Bump=0.16, Syn=1.45. Pre-auction marking blocks first player from top targets. |
   | **Lions** | 0.0% -> 22.2% (+22.2%) | 34.6 -> 31.1 (-3.5) | Defl=1.70, Coin=0.90, Recurr=1.00, Aggr=0.98, Resv=1, Bump=0.19, Syn=1.30. Dynamic 1st claim aggression (1.50) grabs purse bounty. |
   | **Falcons** | 16.7% -> 22.2% (+5.5%) | 32.7 -> 29.2 (-3.5) | Defl=1.59, Coin=1.00, Recurr=1.00, Aggr=1.11, Resv=1, Bump=0.40, Syn=1.07. Per-phase mulligan resets poor auction boards. |
   | **Steelers** | 11.1% -> 16.7% (+5.6%) | 35.2 -> 31.5 (-3.7) | Defl=1.81, Coin=1.60, Recurr=1.00, Aggr=0.76, Resv=4, Bump=0.20, Syn=1.55. Bankroll lead cushion protects start-of-round opponent tax. |
   | **Texans** | 5.6% -> 16.7% (+11.1%) | 37.3 -> 35.8 (-1.5) | Defl=1.60, Coin=1.20, Recurr=1.20, Aggr=1.08, Resv=2, Bump=0.20, Syn=1.57. Heavy QB targeting triggers +2 coins / +2 deflate refresh. |
   | **Titans** | 16.7% -> 11.1% (-5.6%) | 30.5 -> 30.9 (+0.4) | Defl=1.54, Coin=1.00, Recurr=1.10, Aggr=1.10, Resv=2, Bump=0.29, Syn=1.36. Post-auction discard drafting provides extra engine depth. |
   | **Rams** | 5.6% -> 11.1% (+5.5%) | 34.7 -> 31.3 (-3.4) | Defl=2.00, Coin=0.80, Recurr=1.10, Aggr=1.02, Resv=3, Bump=0.20, Syn=1.26. Automated 2x token attachment doubles Phase 2/HOF powerhouse. |
   | **Chargers** | 5.6% -> 5.6% (Neutral) | 38.0 -> 37.9 (-0.1) | Defl=1.60, Coin=1.00, Recurr=1.00, Aggr=0.90, Resv=3, Bump=0.45, Syn=1.20. Collects coins when outbid; vulnerable to opponent pass-trapping. |
   | **Colts** | 0.0% -> 5.6% (+5.6%) | 43.9 -> 37.1 (-6.8) | Defl=1.90, Coin=0.90, Recurr=2.00, Aggr=1.21, Resv=0, Bump=0.10, Syn=1.46. Unlimited lineup capacity but permanent inability to replace cuts. |

4. Definitive 31-Franchise Post-Optimization League Balance Tournament (1,500 Games):
   - **Methodology**: 500 games each across 4-Player, 7-Player, and 10-Player tables with random, balanced franchise matching. Total: 10,500 player appearances (~340 games per team).

   | Rank | Franchise | Total Games | Wins | Overall Win % | Avg PSI | 4P Win % | 7P Win % | 10P Win % | Tier Classification |
   | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
   | **1** | **New England Patriots** | 344 | 128 | **37.2%** | 25.5 | 49% | 43% | 30% | **Tier 1 (Elite / Best)** |
   | **2** | **New Orleans Saints** | 339 | 106 | **31.3%** | 25.9 | 44% | 38% | 20% | **Tier 1 (Elite / Best)** |
   | **3** | **Green Bay Packers** | 342 | 106 | **31.0%** | 26.0 | 45% | 30% | 26% | **Tier 1 (Elite / Best)** |
   | **4** | **Arizona Cardinals** | 374 | 98 | **26.2%** | 26.8 | 41% | 30% | 18% | **Tier 1 (Elite / Best)** |
   | **5** | **Chicago Bears** | 333 | 81 | **24.3%** | 27.4 | 46% | 23% | 16% | **Tier 1 (Elite / Best)** |
   | **6** | **San Francisco 49ers** | 309 | 68 | **22.0%** | 29.6 | 33% | 24% | 15% | **Tier 1 (Elite / Best)** |
   | **7** | **Baltimore Ravens** | 349 | 68 | **19.5%** | 27.9 | 33% | 19% | 15% | **Tier 1 (Elite / Best)** |
   | **8** | **Cleveland Browns** | 324 | 63 | **19.4%** | 27.8 | 29% | 23% | 13% | **Tier 1 (Elite / Best)** |
   | **9** | **Kansas City Chiefs** | 335 | 63 | **18.8%** | 28.9 | 29% | 15% | 17% | **Tier 1 (Elite / Best)** |
   | **10** | **Dallas Cowboys** | 357 | 65 | **18.2%** | 28.8 | 31% | 15% | 16% | **Tier 1 (Elite / Best)** |
   | **11** | **Jacksonville Jaguars** | 337 | 51 | **15.1%** | 29.9 | 28% | 16% | 9% | **Tier 2 (Middle / Balanced)** |
   | **12** | **Carolina Panthers** | 332 | 50 | **15.1%** | 29.9 | 40% | 13% | 8% | **Tier 2 (Middle / Balanced)** |
   | **13** | **Philadelphia Eagles** | 332 | 48 | **14.5%** | 32.0 | 23% | 15% | 11% | **Tier 2 (Middle / Balanced)** |
   | **14** | **New York Jets** | 333 | 45 | **13.5%** | 29.6 | 24% | 11% | 11% | **Tier 2 (Middle / Balanced)** |
   | **15** | **Minnesota Vikings** | 318 | 41 | **12.9%** | 30.7 | 28% | 8% | 10% | **Tier 2 (Middle / Balanced)** |
   | **16** | **Las Vegas Raiders** | 322 | 38 | **11.8%** | 30.5 | 38% | 10% | 5% | **Tier 2 (Middle / Balanced)** |
   | **17** | **Buffalo Bills** | 332 | 36 | **10.8%** | 33.5 | 19% | 10% | 9% | **Tier 2 (Middle / Balanced)** |
   | **18** | **Pittsburgh Steelers** | 336 | 34 | **10.1%** | 34.5 | 22% | 7% | 6% | **Tier 2 (Middle / Balanced)** |
   | **19** | **Miami Dolphins** | 371 | 37 | **10.0%** | 31.5 | 17% | 10% | 6% | **Tier 2 (Middle / Balanced)** |
   | **20** | **Seattle Seahawks** | 365 | 36 | **9.9%** | 32.9 | 21% | 8% | 6% | **Tier 2 (Middle / Balanced)** |
   | **21** | **Denver Broncos** | 299 | 29 | **9.7%** | 30.9 | 22% | 8% | 6% | **Tier 2 (Middle / Balanced)** |
   | **22** | **Tampa Bay Buccaneers** | 321 | 31 | **9.7%** | 33.9 | 19% | 9% | 6% | **Tier 3 (Worst / Challenging)** |
   | **23** | **Detroit Lions** | 367 | 35 | **9.5%** | 34.4 | 15% | 14% | 4% | **Tier 3 (Worst / Challenging)** |
   | **24** | **Cincinnati Bengals** | 337 | 29 | **8.6%** | 32.5 | 11% | 13% | 5% | **Tier 3 (Worst / Challenging)** |
   | **25** | **Washington Commanders** | 325 | 26 | **8.0%** | 33.8 | 21% | 6% | 3% | **Tier 3 (Worst / Challenging)** |
   | **26** | **Houston Texans** | 341 | 25 | **7.3%** | 35.0 | 8% | 7% | 7% | **Tier 3 (Worst / Challenging)** |
   | **27** | **Tennessee Titans** | 363 | 22 | **6.1%** | 34.6 | 21% | 6% | 1% | **Tier 3 (Worst / Challenging)** |
   | **28** | **Los Angeles Rams** | 336 | 17 | **5.1%** | 35.4 | 8% | 6% | 4% | **Tier 3 (Worst / Challenging)** |
   | **29** | **Atlanta Falcons** | 347 | 16 | **4.6%** | 36.4 | 17% | 2% | 2% | **Tier 3 (Worst / Challenging)** |
   | **30** | **Los Angeles Chargers** | 330 | 7 | **2.1%** | 40.4 | 4% | 2% | 1% | **Tier 3 (Worst / Challenging)** |
   | **31** | **Indianapolis Colts** | 350 | 1 | **0.3%** | 41.8 | 1% | 0% | 0% | **Tier 3 (Worst / Challenging)** |

5. Analytical Breakdown & Strategic Insights:
   - **Tier 1 (The Elite 10 — Win Rates 18% to 37%)**:
     - *Common Strengths*: Incontrovertible early-game tempo (Patriots' 7 starting coins yields an overwhelming 49% 4P / 43% 7P win rate), unconditional passive generation (Cowboys +2 coins, Packers +4 deflate), complete defense/immunity (Saints ignore all hostile PSI attacks and Amon-Ra coin steals, enabling uninterrupted engine building), or harsh economic disruption (Bears' +2 outbid penalty drains opponent purses).
     - *Evolutionary Adaptation*: These teams evolved high deflation valuation (`deflateWeight` 1.80–3.50) and disciplined coin reserves, knowing their franchise perks naturally solve income.
   - **Tier 2 (The Balanced Middle 11 — Win Rates 9.7% to 15.1%)**:
     - *Healthy Competitive Balance*: These teams represent the core parity of Deflategate. Panthers (40% 4P) and Raiders (38% 4P) are lethal in small lobbies where their passive deflation or targeted menace hits proportionally harder, but settle into realistic 8–13% win rates in 10-player games.
     - *Mechanic-Driven Value*: Jets' immediate max-bid jumping produces -4 PSI spikes that win quick games. Eagles' Tush Push is devastating when holding a large purse, and Bills' calibrated discard pickup (10.8% overall) now reliably retrieves discarded superstars.
   - **Tier 3 (Challenging & Underperforming 10 — Win Rates 0.3% to 9.7%)**:
     - *Root Causes*:
       - **Colts (0.3% WR, 41.8 Avg PSI)**: The permanent inability to replace active players means a single negative or mediocre player permanently poisons their lineup, causing them to fall behind in long games.
       - **Chargers (2.1% WR, 40.4 Avg PSI)**: Gaining +1 coin upon being outbid relies on opponents actively bidding against them. Smart CPUs refuse to outbid Chargers when Chargers bid on mediocre cards, effectively trapping them into buying bad players.
       - **Falcons (4.6% WR, 36.4 Avg PSI)**: Mulligan ability is high variance and does not guarantee superior draft quality.
       - **Rams (5.1% WR, 35.4 Avg PSI)**: Although CPU automation now attaches the 2x token, Rams rely heavily on surviving long enough to draft and double an elite Phase 2 or HOF card.
       - **Titans (6.1%), Texans (7.3%), Commanders (8.0%)**: Face high competition for specialized synergy targets (e.g. Texans QBs).

6. File Artifacts & Deployment:
   - Optimized genomes saved to `src/ai/team_weights.json` and active live in `src/ai/evolvedWeights.js`.
   - Full dataset saved in `scratch/optimization_round2_results.json`.
   - Production bundle verified with `npm run build` passing cleanly in 5.04s.


