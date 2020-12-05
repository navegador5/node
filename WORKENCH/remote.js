net.createServer(function(socket) {
     repl.start("node via TCP socket> ", socket,undefined,true);
   }).listen(5001);
