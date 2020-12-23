var cool = require('cool-ascii-faces');
var express = require('express');
var app = express();
var pg = require('pg');
var bodyParser = require('body-parser');
var server = require('http').createServer(app);
var io = require('socket.io').listen(server, {pingTimeout: 15000, pingInterval: 10000});



io.on('connection', function (socket) {
	console.log("a user connected");
	socket.on('addNoteEntry', function (data) {
		console.log("Client says hi! "+data);
	});

	socket.on('textCommand', function ( data ) {
		io.sockets.emit('textCommandResponse',{ response: processRawCommandData(data.command)});
		//executeCommand does not work in this implementaxtion. Currently requires request and response objects. Can we separate this logic so that we just have one executeCommand function?
		//executeCommand(processRawCommandData(data.command));
	});
});

var TOKENS = {};
TOKENS.Invocation = "VASH";

var COMMANDS = {};
COMMANDS.OrderFor = "order for";
COMMANDS.Create = "create";

var STATE = {};
STATE.Recipe = 1;
STATE.Todoist = 2;
STATE.Sheet = 3;
STATE.Note = 4;
STATE.WaitForUserResponse = 5;
STATE.Home = 0;

var VASH = { };
VASH.state = STATE.Home;
VASH.changeState = function ( newState ) {
	//should check to see if we can change the state
	this.state = newState;
	io.emit('changeState',newState);
};

var NOTE = { };
NOTE.currentNoteId = 0;
NOTE.title = "";
NOTE.entries = [];
NOTE.openNote = function ( noteName ) {
	//INNER JOIN
	//select noteentries.entryid, noteentries.created, noteentries.content from noteentries inner join notes on noteentries.noteid = 3;
	var sqlQuery = "select * from notes where name ~* '"+noteName+"' order by created asc limit 1";
	pg.connect(process.env.DATABASE_URL, function ( err, client, done ) {
		client.query(sqlQuery, function(err, result) {
			//console.log(result.rows);
			if (result.rows.length==1) {
				NOTE.currentNoteId = result.rows[0].noteid;
				NOTE.title = result.rows[0].name;
				console.log("Current NOTE id: "+NOTE.currentNoteId);
				sqlQuery = "select * from noteentries where noteid = "+NOTE.currentNoteId+" order by entryid asc";
				console.log(sqlQuery);
				pg.connect(process.env.DATABASE_URL, function ( err, client, done ) {
					client.query(sqlQuery, function(err, result) {
						//console.log(result.rows);
						NOTE.entries = result.rows;
						VASH.changeState(STATE.Note);
						io.emit('openNote',NOTE.getData());
						done();
					}); 
				});
			}
			done(); 
		}); 
	});
}

NOTE.createNote = function ( noteName ) {
	var sqlQuery = "insert into notes (name) values ('"+noteName+"')";
	pg.connect(process.env.DATABASE_URL, function ( err, client, done ) {
		client.query(sqlQuery, function(err, result) {
			if (err) {
				console.log("NOTE.createNote: error creating note named: "+noteName);
			} else {
				NOTE.openNote(noteName);
			}
			done();
		});
	});
}

NOTE.getData = function ( ) {
	return { noteid: this.currentNoteId, title: this.title, entries: this.entries };
}

NOTE.addEntry = function ( data ) { 
	console.log("addEntry currentNoteId "+this.currentNoteId);
	var sqlQuery = "insert into noteentries (noteid,content) values ("+this.currentNoteId+",'"+data.content+"') returning entryid";
	pg.connect(process.env.DATABASE_URL, function ( err, client, done ) {
		client.query(sqlQuery, function(err, result) {
			if(err) {
				console.log("addEntry query failed");
			} else {
				io.emit('addNoteEntry',{entryid: result.rows[0].entryid, args: data.content});
				console.log(result.rows[0].entryid);
			}
			done();
		});
	});
}

NOTE.clearEntries = function ( ) {
	console.log("clearEntries currentNoteId "+this.currentNoteId);
	var sqlQuery = "delete from noteentries where noteid="+this.currentNoteId;
	pg.connect(process.env.DATABASE_URL, function ( err, client, done ) {
		client.query(sqlQuery, function(err, result) {
			if(err) {
				console.log("addEntry query failed");
			} else {
				io.emit('clearEntries');
			}
			done();
		});
	});
}

NOTE.deleteEntry = function ( entryId ) {
	console.log("NOTE deleteEntry currentNoteId "+this.currentNoteId);
	var sqlQuery = "delete from noteentries where entryid="+entryId+" and noteid="+this.currentNoteId;
	pg.connect(process.env.DATABASE_URL, function ( err, client, done ) {
		client.query(sqlQuery, function(err, result) {
			if(err) {
				console.log("deleteEntry query failed");
			} else {
				io.emit('deleteEntry',entryId);
			}
			done();
		});
	});
}

NOTE.saveNote = function ( ) {

}



var processRawCommandData = function ( rawCommand ) {
	console.log("processRawComamndData - VASH.state: "+VASH.state);
	var command = { command: "", arg: ""};
	var commandData;
	if ( typeof rawCommand === 'undefined' ) {
		command.command = "error";
		command.arg = "rawCommand is undefined";
		return command;
	} else {
		commandData = rawCommand.split(" ");		
	}
	var firstCommand, secondCommand, thirdCommand;
	if ( commandData.length == 1 && commandData[0] != "" ) { 
		command.command = commandData[0].toLowerCase();
	} else if ( commandData.length > 1 ) {
		firstCommand = commandData[0].toLowerCase();
		if ( firstCommand == "create" ) {
			if ( commandData.length > 2 ) {
				secondCommand = commandData[1].toLowerCase();
				if ( secondCommand == "note" ) {
					commandData.splice(0,2);
					command.command = "create note";
					command.arg = commandData.join(' ');
				} else if ( secondCommand == "recipe" ) {
					commandData.splice(0,2);	
					command.command = "create recipe";
					command.arg = commandData.join(' ');
				}
			} else if ( commandData.length == 2 ) {
				command.command = "error";
				command.arg = "missing argument NAME";
			}
		} else if ( firstCommand == "display" ) {

		} else if ( firstCommand == "order" ) {
			if ( commandData.length > 2 ) {
				secondCommand = commandData[1].toLowerCase();
				if ( secondCommand == "for" ) {
					commandData.splice(0,2);
					command.command = "order for";
					command.arg = commandData.join(' ');
				}
			} else if ( commandData.length == 2 ) {
				command.command = "error";
				command.arg = "missing argument NAME";
			}

		} else if (firstCommand == "open" ) {
			if ( commandData.length > 2 ) {
				secondCommand = commandData[1].toLowerCase();
				if ( secondCommand == "note" ) {
					commandData.splice(0,2);
					command.command = "open note";
					command.arg = commandData.join(' ');
				}
			} else if ( commandData.length == 2 ) {
				command.command = "error";
				command.arg = "missing argument NAME";
			}
		} else if ( firstCommand == "add") {
			commandData.splice(0,1);
			command.command = "add";
			command.arg = commandData.join(' ');
		} else if ( firstCommand == "delete" ) {
			commandData.splice(0,1);
			command.command = "delete";
			command.arg = commandData.join(' ');
		} 
	} else {
		command.command = "error";
		command.arg = "unknown command";
	}
	return command;
}

var executeCommand = function ( request, response ) {
	var commandText = request.body.commandText;
	commandText = commandText.replace(/[\\$"]/g, "\\$&"); //escape the string
	commandText = commandText.replace(/[']/g, "\'$&"); //escape the string	
	var commandNumber = request.body.commandNumber;
	console.log("CommandText from IFTTT: "+commandText);
	var sqlQuery = "INSERT INTO rawCommands (command) values ('"+commandText+"')";
	//response.send("Post request");
	//console.log("Query: "+sqlQuery);
	pg.connect(process.env.DATABASE_URL, function ( err, client, done ) {
		client.query(sqlQuery, function(err, result) {
			done();
			//we need to escape the command input/output to hanlde quotations and what not!!!
			if(err){
				//console.error(err); response.send("Error " + err);
				console.log("Query Error");
			}
			else {
				console.log("Query success!!");
				var command = processRawCommandData(commandText);
				var rawCommandData = commandText.split(" ");
				var commandData;
				if ( rawCommandData.length < 1 ) {
					response.end();
					return;
				}
				console.log("command: "+command.command+" state: "+VASH.state);
				if ( command.command == "add" && VASH.state == STATE.Note ) {
					commandData = { command: command.command, args: command.arg };
					NOTE.addEntry({content: command.arg});
					//response.end();
					//return;
				}

				if ( command.command == "delete" && VASH.state == STATE.Note ) {

					commandData = { command: command.command, args: command.arg };
					NOTE.deleteEntry(command.arg);
					//response.end();
					//return;
				}

				if ( command.command == "order for" ) {
					commandData = { command: command.command, args: { displayString: command.arg }};
				} else if ( command.command == "create note" ) {
					/*client.query("insert into notes (name) values ('"+command.arg+"')", function(err,result){
						done();
						if(err){
							console.log("Note creation error!");
						} else {
							console.log("Note created yay!");
							VASH.changeState(STATE.Note);
							
						}
					});*/
					NOTE.createNote(command.arg);
					commandData = { command: command.command, args: command.arg };
				} else if ( command.command == "open note" ) {
					NOTE.openNote(command.arg);
					
					commandData = { command: command.command, args: command.arg };

				}

				console.log("Command Data: "+commandData);
				io.emit('updateCommand',commandData);
				response.end();
				//response.render('pages/db', { results: result.rows } );
			}

		});
	});
}




app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
	
  response.render('pages/index');
});

app.post('/', function ( request, response ) { 

	console.log("Posted something!");
	//response.send('blurg');
} ); 

app.post('/ifttt', function ( request, response ) { 
	/*console.log("Posted!!!!");
	console.log(request.body);
	console.log("commandName "+request.body.commandText);*/
	var commandText = request.body.commandText;
	commandText = commandText.replace(/[\\$"]/g, "\\$&"); //escape the string
	commandText = commandText.replace(/[']/g, "\'$&"); //escape the string	
	var commandNumber = request.body.commandNumber;
	console.log("CommandText from IFTTT: "+commandText);
	var sqlQuery = "INSERT INTO rawCommands (command) values ('"+commandText+"')";
	//response.send("Post request");
	//console.log("Query: "+sqlQuery);
	pg.connect(process.env.DATABASE_URL, function ( err, client, done ) {
		client.query(sqlQuery, function(err, result) {
			done();
			//we need to escape the command input/output to hanlde quotations and what not!!!
			if(err){
				//console.error(err); response.send("Error " + err);
				console.log("Query Error");
			}
			else {
				console.log("Query success!!");
				var command = processRawCommandData(commandText);
				var rawCommandData = commandText.split(" ");
				var commandData;
				if ( rawCommandData.length < 1 ) {
					response.end();
					return;
				}
				console.log("command: "+command.command+" state: "+VASH.state);
				if ( command.command == "add" && VASH.state == STATE.Note ) {
					commandData = { command: command.command, args: command.arg };
					NOTE.addEntry({content: command.arg});
					//response.end();
					//return;
				}

				if ( command.command == "delete" && VASH.state == STATE.Note ) {

					commandData = { command: command.command, args: command.arg };
					NOTE.deleteEntry(command.arg);
					//response.end();
					//return;
				}

				if ( command.command == "order for" ) {
					commandData = { command: command.command, args: { displayString: command.arg }};
				} else if ( command.command == "create note" ) {
					/*client.query("insert into notes (name) values ('"+command.arg+"')", function(err,result){
						done();
						if(err){
							console.log("Note creation error!");
						} else {
							console.log("Note created yay!");
							VASH.changeState(STATE.Note);
							
						}
					});*/
					NOTE.createNote(command.arg);
					commandData = { command: command.command, args: command.arg };
				} else if ( command.command == "open note" ) {
					NOTE.openNote(command.arg);
					
					commandData = { command: command.command, args: command.arg };

				}

				console.log("Command Data: "+commandData);
				io.emit('updateCommand',commandData);
				response.end();
				//response.render('pages/db', { results: result.rows } );
			}

		});
	});
	
});

app.post('/clock', function ( request, response ) { 
	var commandText = request.body.commandText; //need to escape this string
	var commandNumber = 17;
	var sqlQuery = "INSERT INTO test_table values ("+commandNumber+",'"+commandText+"')";
	//response.send("Post request");
	console.log("Query: "+sqlQuery);
	pg.connect(process.env.DATABASE_URL, function ( err, client, done ) {
		client.query(sqlQuery, function(err, result) {
			done();
			if(err){
				//console.error(err); response.send("Error " + err);
				console.log("Query Error");
			}
			else {
				console.log("Query success??");
				//response.render('pages/db', { results: result.rows } );
			}

		});
	});
});


app.get('/ifttt', function ( request, response ) { 
	response.send("request");
});

app.get('/commands', function ( request, response ) {
	response.setHeader('Content-Type', 'application/json');
	pg.connect(process.env.DATABASE_URL, function ( err, client, done ) {
		client.query('SELECT * FROM rawCommands', function(err, result) {
			done();
			if(err){
				console.error(err); response.send("Error " + err);
			}
			else {
				console.log(JSON.stringify(result.rows));
				response.send(JSON.stringify(result.rows));
			}

		});
	});

} );

app.get('/cool', function ( request, response ) {
	response.send(cool());
});

app.get('/db', function ( request, response ) { 
	pg.connect(process.env.DATABASE_URL, function ( err, client, done ) {
		client.query('SELECT * FROM rawCommands', function(err, result) {
			done();
			if(err){
				console.error(err); response.send("Error " + err);
			}
			else {
				response.render('pages/db', { results: result.rows } );
			}

		});
	});
});

app.get('/orderfor', function ( request, response ) {
	response.render('pages/orderfor');

} );

app.get('/parserTest', function ( request, response ) {
	response.render('pages/parserTest'); 

} );

app.get('/commandtest', function ( request, response ) { 

});

app.get('/times', function ( request, response ) {
	var result = '';
	var times = process.env.TIMES || 5;
	for ( i=0; i<times; i++)
		result += i + ' ';
	response.send(result);
});

server.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

