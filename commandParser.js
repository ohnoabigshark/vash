//commandParser.js

//parse into tokens
//return command and arguments
//panel one
//close panel
//{ command: command, args: { } }



//Should CommandLibrary be the parent object and each contains a CommandParser?
//CommandParser could just be a singletons
//CommandParser constructor should take a CommandLibrary object
//CommandLibrary is just a Map
//OR...should each Command have its own CommandLibrary?
let CommandParser =  function ( library ) {
	this.library = library;
}

CommandParser.parseTokens = function ( str ) {
	var rawTokens = [];
	rawTokens = str.split(" ");
	switch ( rawTokens[0] )
}

CommandParser.smartParse = function ( commandString ) {
	let vashCommand = { action: "", args: "", error: false, errorMessage: "" };
	let commandTokens = [];

	//Check commandString for undefined/null to ensure we have some data to work with
	//return error if no data is present
	if ( typeof commandString === 'undefined' ) {
		vashCommand.error = true;
		vashCommand.errorMessage = "commandString undefined"
		return vashCommand;
	} else if ( typeof commandString != "String" ) {
		vashCommand.error = true;
		vashCommand.errorMessage = "commandString is not a string";
		return vashCommand;
	} else if ( commandString.length <= 0 ) {
		vashCommand.error = true;
		vashCommand.errorMessage = "commandString contains no data";
		return vashCommand;
	} else {
		commandTokens = commandString.split(" ");
	}

	
	return vashCommand;

}

//Check to see if string is a command
CommandParser.isCommand = function ( str ) {

	//does CommandLibrary contain the key?
	if ( library.has(str) ) {
		return true;
	}
	return false;

}

CommandParser.parseCommand = function ( rawCommand ) { 
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
