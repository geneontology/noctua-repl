////
//// REPL environment for Noctua.
////
//// Currently testing with:
////  : ~/local/src/git/noctua-repl$:) node ./bin/noctua-repl.js --token=123 --barista http://localhost:3400
////

var bbop = require('bbop');
var bbopx = require('bbopx');
// require('fs').readFileSync(process.env.TEST)+'');
var fs = require('fs');
var repl = require('repl');

///
/// Helpers
///

var what_is = bbop.core.what_is;

function _die(message){
    console.error(message);
    process.exit(-1);
}

///
/// Process CLI options.
///

var argv = require('minimist')(process.argv.slice(2));
//console.dir(argv);

// token
var token = argv['t'] || argv['token'];
if( ! token || (what_is(token) != 'string' && what_is(token) != 'number' ) ){
    _die('Option (t|token) is required.');
}else{
    console.log('Using user token: ' + token);
}

// barista_server
var barista_server = argv['s'] || argv['server'];
//var barista_server_default = 'http://barista.berkeleybop.org';
var barista_server_default = 'http://localhost:3400';
if( ! barista_server || what_is(barista_server) != 'string' ){
    //_die('Option (s|server) is required.');
    barista_server = barista_server_default;
    console.log('Using default Barista server at: ' + barista_server);
}else{
    console.log('Using Barista server at: ' + barista_server);
}

// barista_definition
var barista_definition = argv['d'] || argv['definition'];
var barista_definition_default = 'minerva_local';
if( ! barista_definition || what_is(barista_definition) != 'string' ){
    //_die('Option (d|definition) is required.');
    barista_definition = barista_definition_default;
    console.log('Using default Barista definition at: ' + barista_definition);
}else{
    console.log('Using Barista server at: ' + barista_server);
}

// TODO: (optional) file
var file = argv['f'] || argv['file'];
if( ! file || bbop.core.what_is(file) != 'string' ){
    // Is optional; pass.
}else{
    console.log('[TODO] Run file: ' + file);
}

///
/// Spin up REPL and create running environment.
///

// Start repl.
var repl_run = repl.start({'prompt':
			   'noctua@'+barista_server+'|'+barista_definition+'> ',
			   'input': process.stdin,
			   'output': process.stdout,
			   'useGlobal': true
			  });

// // Add BBOP(X).
// repl_run.context['bbop'] = bbop;
// repl_run.context['bbopx'] = bbopx;

// Add manager and default callbacks to repl.
var manager = new bbopx.minerva.manager(barista_server, barista_definition,
					token, 'node', false);
var request_set = null;
var response = null;
var model_id = null;
var query_url = null;

// Generic way of handling problems during responses.
function _announce_problem(type, resp, man){
    console.error('\n');
    console.error('There was a '+ type + ' (' +
		  resp.message_type() + '): ' + resp.message());
    console.error('\n');
}

// "prerun" callback.
manager.register('prerun', 'default_pre', function(){
    console.log('prerun...');
});

// "postrun" callback.
manager.register('postrun', 'default_post', function(){
    console.log('postrun...');
});

// "manager_error" callback.
manager.register('manager_error', 'default_manager_error', function(resp, man){
    _announce_problem('manager error', resp, man);
    repl_run.context['response'] = resp;
});

// "error" callback.
manager.register('error', 'default_error', function(resp, man){
    _announce_problem('error', resp, man);
    repl_run.context['response'] = resp;
});

// "warning" callback.
manager.register('warning', 'default_warning', function(resp, man){
    _announce_problem('warning', resp, man);
    repl_run.context['response'] = resp;
});

// // Tag on manger and result contexts.
// repl_run.context['manager'] = manager;
// repl_run.context['request_set'] = request_set;
// repl_run.context['response'] = response;
// repl_run.context['model_id'] = model_id;

///
/// Activites.
///

function show(x){
    if( x && x.structure ){
	console.log(JSON.stringify(x.structure(), null, ' '));
    }else{
	console.log(JSON.stringify(x, null, ' '));
    }
}

// function _ensure(){
//     if( ! model_id ){
	
//     }
// }

function get_relations(){
    request_set = new bbopx.minerva.request_set(token);
    request_set.get_relations();
    manager.request_with(request_set);
    query_url = manager.request_with(request_set);
}
//repl_run.context['get_relations'] = get_relations;

function add_individual(cls_expr){
    request_set = new bbopx.minerva.request_set(token, model_id);
    request_set.add_individual(cls_expr);
    query_url = manager.request_with(request_set);
    repl_run.context['request_set'] = request_set;
    repl_run.context['query_url'] = query_url;
}
//repl_run.context['add_individual'] = add_individual;

///
/// Export important things to REPL environment.
///

var export_context =
	[
	    'token',
	    'bbop',
	    'bbopx',
	    'show',
	    'manager',
	    'request_set',
	    'response',
	    'model_id',
	    'query_url',
	    'get_relations',
	    'add_individual'
	];
export_context.forEach(function(symbol){
    eval("repl_run.context['"+symbol+"'] = "+symbol+";");
});

// var r = new bbopx.minerva.request_set(token);
// r.get_relations();
//
// model_id = 'gomodel:553856550000001'; add_individual('GO:0022008');

// // Closure test--this works in repl.
// var close_i = 2;
// function incr(){
//     if( typeof(close_i) !== 'undefined' ){
// 	close_i++;
// 	console.log('close_i is: ' + close_i);
//     }else{
// 	console.error('no close_i');
//     }
// }
// repl_run.context['incr'] = incr;
