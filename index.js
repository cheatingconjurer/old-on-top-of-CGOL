var WebSocketServer = require("ws").Server
var http = require("http")
var express = require("express")
var app = express()
var port = process.env.PORT || 5000

app.use(express.static(__dirname + "/"))

var server = http.createServer(app)
server.listen(port)

console.log("http server listening on %d", port)

var wss = new WebSocketServer({server: server})
console.log("websocket server created")

var connections=[]
var queue = []
var players = []
var game={}
var actions=[null,null]
game.running=false
game.roundnr=0
game.players={"0":"9,89","1":"89,9"}
game.homes={"0":"9,89","1":"89,9"}

wss.on("connection", function(ws) {
  //var id = setInterval(function() {
  //  ws.send(JSON.stringify(new Date()))
  //}, 1000)
  ws.cindex=connections.length;
  connections.push(ws);

  console.log("websocket connection open "+ws.cindex)
  ws.send(JSON.stringify(game));

  ws.on("close", function() {
    //clearInterval(id)
    connections[ws.cindex]=null;
    if(ws.qindex!=undefined){queue[ws.qindex]=null}
    if(ws.playerNr!=undefined){
     connections.forEach(function(connection){if(connection){
      connection.send("w"+players[0].playername+" vs "+players[1].playername+":nobody won,"+players[ws.playerNr].playername+" disconnected")
     }});
     console.log("game ended because "+ws.playername+" disconnected")
     endOfGame()
    }
    console.log("websocket connection close "+ws.cindex)
  })
  ws.on("message",function(m){
   //if(m[0]=="x"){console.log("game hacked");game=JSON.parse(m.slice(1));actions=[{blocks:[],movement:[0,0]},{blocks:[],movement:[0,0]}];endOfRound()}
   //if(m=="dontforgettoremovethis"){endOfRound()}//dont forget to remove this
   //if(m=="testserversideblocksupply"){console.log("block supply",blockSupply)}
   if(m=="testplayers"){console.log("players",players)}
   if(m=="testqueue"){console.log("queue",queue)}
   if(m=="testconnections"){console.log("connections");connections.forEach(function(connection){if(connection){console.log(connection.cindex)}})}
   if(m=="testrunning"){console.log("running",game.running)}
   //if(m=="keepAlive"){console.log("recieved keepAlive from",ws.cindex)}
   if(m[0]=="a"&&ws.playerNr!=undefined){
    try{
     actions[ws.playerNr]=JSON.parse(m.slice(1))
     var test=actions[ws.playerNr].movement[0]
     if(typeof(test)!="number"){throw("movement not a number")}
     var test=actions[ws.playerNr].movement[1]
     if(typeof(test)!="number"){throw("movement not a number")}
     var test=actions[ws.playerNr].blocks["test"]
    }catch(error){
     actions[ws.playerNr]={blocks:[],movement:[0,0]}
     console.log("i call hax,",players[ws.playerNr].playername," submitted malformed data",error)
    }
    if(actions[0]&&actions[1]){endOfRound()}
   }
   if(m[0]=="q"&&ws.playerNr==undefined&&ws.qindex==undefined){
    ws.playername=m.substring(1,20)
    if(ws.playername==""){ws.playername="unnamed"}
    ws.qindex=queue.length
    queue.push(ws)
    console.log("queue join "+ws.qindex)
    //console.log(queue)
    if(!game.running){
     var queuedPlayers=0
     queue.forEach(function(player){
      if(player){queuedPlayers++}
     })
     if(queuedPlayers>=2){startNewGame()}
    }
   }
  })
})

startNewGame=function(){
 game.roundnr=0
 blockSupply=[20.0,20.0]
 for(i=0;i<2;i++){
  value=null
  while(value==null){
   value=queue.shift()
   queue.forEach(function(element){if(element){
    element.qindex--
   }})
  }
  players.push(value)
  value.qindex=undefined
 }
 console.log("game started:"+players[0].playername+" vs "+players[1].playername)

 players[0].playerNr=0
 players[1].playerNr=1
 game.running=true;
 initializeGrid()
 for(i=0;i<100;i++){game.grid["49,"+parseInt(i)]=Math.random()>0.2?1:0}//
 game.players={"0":"9,89","1":"89,9"}
 game.grid["9,89"]=1;game.grid["8,88"]=1;game.grid["10,88"]=1;game.grid["9,87"]=1
 game.grid["89,9"]=1;game.grid["90,9"]=1;game.grid["89,8"]=1;game.grid["90,8"]=1
 game.homes={"0":"9,89","1":"89,9"}
 //game.grid["50,50"]=1;game.grid["50,51"]=1;game.grid["50,52"]=1
 connections.forEach(function(connection){
  if(connection){
   connection.send(JSON.stringify(game) )
  }
 });
 players.forEach(function(player){
  player.send(String(player.playerNr))
 })
}


initializeGrid=function(){
  game.grid={}
  for(ix=0;ix<100;ix++){
   for(iy=0;iy<100;iy++){
    game.grid[String(ix)+","+String(iy)]=0
   }
  }

}

endOfRound=function(){

 game.roundnr+=1
 fallenPlayers=[false,false]
 losers=[false,false]
 
 for(i=0;i<2;i++){
  if(!(actions[i].movement[0]>=-6&&actions[i].movement[0]<=6&&actions[i].movement[1]>=-6&&actions[i].movement[1]<=6)){
   console.log("i call hax",players[i].playername,i,"moved",actions[i].movement,"more then allowed")
   actions[i].movement=[0,0]
  }
  var coords=game.players[String(i)].split(",")
  coords[0]=parseInt(coords[0])
  coords[1]=parseInt(coords[1])
  if(coords[0]+actions[i].movement[0]<0||coords[0]+actions[i].movement[0]>99||coords[1]+actions[i].movement[1]<0||coords[1]+actions[i].movement[1]>99){
   console.log("i call hax",players[i].playername,i,"moved to",actions[i].movement[0]+coords[0],actions[i].movement[1]+coords[1],"out of the map")
   actions[i].movement=[0,0]
  }
 }
 
 var newGrid={}
 for(x=0;x<100;x++){
  for(y=0;y<100;y++){
   adjacents=0
   for(dx=-1;dx<2;dx++){
    for(dy=-1;dy<2;dy++){
     if(dx||dy){
      if(game.grid[String(x+dx)+","+String(y+dy)]){adjacents++}
     }
    }
   }
   if(game.grid[String(x)+","+String(y)]){
    newGrid[String(x)+","+String(y)]=(adjacents==2||adjacents==3)?1:0
   }else{
    newGrid[String(x)+","+String(y)]=(adjacents==3)?1:0
   }
  }
 }
 
 for(i=0;i<2;i++){
  var coords=game.players[String(i)].split(",")
  coords[0]=parseInt(coords[0])
  coords[1]=parseInt(coords[1])
  if(game.grid[String(coords[0]+actions[i].movement[0])+","+String(coords[1]+actions[i].movement[1])]==0){
   if(game.homes[String(i)]){fallenPlayers[i]=true;}else{losers[i]=true}
  }
 }
 
 game.grid=newGrid
 
 for(i=0;i<2;i++){
  if(game.homes[String(i)]){if(game.grid[game.homes[String(i)]]==0){
   game.homes[String(i)]=false
   players[i].send("wyour home point got destroyed, you can't respawn")
  }}
 }
 
 
 for(i=0;i<2;i++){
  position=game.players[String(i)].split(",")
  position[0]=parseInt(position[0])
  position[1]=parseInt(position[1])
  newBlockSupply=blockSupply[i]
  for(x=-6;x<=6;x++){for(y=-6;y<=6;y++){if(actions[i].blocks[String(x)+","+String(y)]){
   newBlockSupply-=1
  }}}
  if(newBlockSupply<0){console.log("i call hax",players[i].playername,i,"would have a block supply of",newBlockSupply,"after placing blocks")}
  for(x=-6;x<=6;x++){
   for(y=-6;y<=6;y++){if(x+position[0]>=0&&x+position[0]<100&&y+position[1]>=0&&y+position[1]<100){
    if(actions[i].blocks[String(x)+","+String(y)]){
     blockSupply[i]-=1;
     game.grid[String(position[0]+x)+","+String(position[1]+y)]=1
    }
   }}
  }
 }
 
 for(i=0;i<2;i++){
  if(blockSupply[i]<20){blockSupply[i]+=0.5}
 }
 
 for(i=0;i<2;i++){
  var coords=game.players[String(i)].split(",")
  coords[0]=parseInt(coords[0])
  coords[1]=parseInt(coords[1])
  game.players[String(i)]=String(coords[0]+actions[i].movement[0])+","+String(coords[1]+actions[i].movement[1])
 }
 
 if(game.players[0]==game.players[1]){
  connections.forEach(function(connection){if(connection){
   connection.send("wfunny, the players collided/merged")
  }});
  console.log("funny, the players collided/merged")
  for(i=0;i<2;i++){
   if(game.homes[String(i)]){fallenPlayers[i]=true;}else{losers[i]=true}
  }
 }
 
 for(i=0;i<2;i++){
  if(fallenPlayers[i]){
   if(game.homes[i]){game.players[i]=game.homes[String(i)];players[i].send("wrespawned")}else{losers[i]=true}
  }
 }
 
 connections.forEach(function(connection){
  if(connection){
   connection.send(JSON.stringify(game) )
  }
 })
 if(game.roundnr>=1000){
  connections.forEach(function(connection){if(connection){
   connection.send("w"+players[0].playername+" vs "+players[1].playername+":nobody won, the game reached round 1000")
  }});
  console.log("game ended because it reached round 1000")
  endOfGame()
 }else{
 if(losers[0]&&losers[1]){
  connections.forEach(function(connection){if(connection){
   connection.send("w"+players[0].playername+" vs "+players[1].playername+":Nobody wins, both players lost at the same time")
  }});
  console.log("game ended because both players lost")
  endOfGame()
 }
 else{
  if(losers[0]){
   connections.forEach(function(connection){if(connection){
    connection.send("w"+players[0].playername+" vs "+players[1].playername+":"+players[1].playername+" wins, "+players[0].playername+" loses")
   }});
   console.log("game ended, "+players[1].playername+" wins, "+players[0].playername+" loses")
   endOfGame()
  }
  if(losers[1]){
   connections.forEach(function(connection){if(connection){
    connection.send("w"+players[0].playername+" vs "+players[1].playername+":"+players[0].playername+" wins, "+players[1].playername+" loses")
   }});
   console.log("game ended, "+players[0].playername+" wins, "+players[1].playername+" loses")
   endOfGame()
  }
 }
 }
 actions=[null,null]
}

endOfGame=function(){
 game.running=false;
 actions=[null,null]
 players.forEach(function(p){if(p){
  p.send("spectator")
  p.playerNr=undefined
 }})
 players=[]
 connections.forEach(function(connection){
  if(connection){
   connection.send(JSON.stringify(game) )
  }
 });
 //starts a new game immediately after game ended
 var queuedPlayers=0
 queue.forEach(function(player){if(player){queuedPlayers++}})
 if(queuedPlayers>=2){startNewGame()}
}
initializeGrid()
//for(i=0;i<100;i++){game.grid[String(0)+","+String(i)]=1}//remove after testing

