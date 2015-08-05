////
//// REPL environment for Noctua.
////
//// Currently testing with:
////  : ~/local/src/git/noctua-repl$:) reset && node ./bin/noctua-repl.js --token=123 --barista http://localhost:3400
////

// Util.
var bbop = require('bbop-core');
var fs = require('fs');
var us = require('underscore');
var repl = require('repl');

var barista_response = require('bbop-response-barista');
var class_expression = require('class-expression');
var minerva_requests = require('minerva-requests');

//
var sync_engine = require('bbop-rest-manager').sync_request;
var minerva_manager = require('bbop-manager-minerva');

// var anchor = this;

///
/// Helpers
///

var what_is = bbop.what_is;

var each = us.each;

function _die(message){
    console.error(message);
    process.exit(-1);
}

///
/// Process CLI options.
///

var argv = require('minimist')(process.argv.slice(2));
//console.dir(argv);

// Get the (pretty much required) token.
var token = argv['t'] || argv['token'];
if( ! token || (what_is(token) !== 'string' && what_is(token) !== 'number' ) ){
    _die('Option (t|token) is required.');
}else{
    console.log('Using user token: ' + token);
}

// Aim at the proper/desired barista server.
var barista_server = argv['s'] || argv['server'];
//var barista_server_default = 'http://barista.berkeleybop.org';
var barista_server_default = 'http://localhost:3400';
if( ! barista_server || what_is(barista_server) !== 'string' ){
    //_die('Option (s|server) is required.');
    barista_server = barista_server_default;
    console.log('Using default Barista server at: ' + barista_server);
}else{
    console.log('Using Barista server at: ' + barista_server);
}

// Work again the proper/desired barista definition.
var barista_definition = argv['d'] || argv['definition'];
var barista_definition_default = 'minerva_local';
if( ! barista_definition || what_is(barista_definition) !== 'string' ){
    //_die('Option (d|definition) is required.');
    barista_definition = barista_definition_default;
    console.log('Using default Barista definition at: ' + barista_definition);
}else{
    console.log('Using Barista server at: ' + barista_server);
}

// The idea here is to be able to run a set of commands in the
// environment in batch. Unlikely to happen until we can enforce a
// synchronous client.
// TODO: (optional) file
var file = argv['f'] || argv['file'];
if( ! file || what_is(file) !== 'string' ){
    // Is optional; pass.
}else{
    console.log('[TODO] Run file: ' + file);
}

///
/// Spin up REPL and create running environment.
///

// Start repl.
var repl_run = repl.start({
    'prompt': 'noctua-repl@' + barista_server + '|' + barista_definition + '> ',
    'input': process.stdin,
    'output': process.stdout,
    'useGlobal': true//,
    // // Try and keep everything in this scope.
    // 'eval': function(cmd, context, filename, callback){
    //     console.log(cmd);    
    //     callback(null, result);
    // }
});

// Okay, this is a little hard to explain. It seems to be quite hard
// to get this context to stay in sync with the REPLs running one once
// it "forks". It seems like it somehow initially "copies" this
// context and no long syncs after initialization. The exception seems
// to be the context in repl_run.
//
// // To simplify this pattern, at the end of functions, to sync the
// // environments, I use this pattern. The arguments are strings.
// //
// // Another, probably cleaner, way of doing this might be to write our
// // own eval function and keep this context (anchor), but with so few
// // examples, I'm williing to work with this for now.
// function _contextualize(context, symbol, argument){
//     if( ! argument ){ argument = symbol; } // often use single arg
//     // eval(symbol+" = "+argument+";");
//     // eval("repl_run.context['"+symbol+"'] = "+argument+";");
//     eval.call(context, symbol+" = "+argument+";");
//     eval.call(context, "repl_run.context['"+symbol+"'] = "+argument+";");
//     eval("repl_run.context['"+symbol+"'] = "+argument+";");
// }

// Extract.
function _get_current_model_id(){
    var mid = repl_run.context['model_id'] || model_id;
    return mid;
}

// Make the request and save the interesting products.
function _request_and_save(manager, request_set){

    // Request.
    var response = manager.request_with(request_set);
    //console.log('query: ', query_url);

    // Capture.
    repl_run.context['request_set'] = request_set;
    repl_run.context['query_url'] = query_url;
}


// Add manager and default callbacks to repl.
var engine = new sync_engine(barista_response);
var manager = new minerva_manager(barista_server, barista_definition,
				  token, engine, 'sync');
var request_set = null;
var response = null;
var model_id = null;
var query_url = null;

// Try and make a general "good" response.
function _good_response_handler(resp){

    // "Display" the returning data.
    show(resp.data());
    
    // Extract any model ID and assign it to the environment as the
    // default--probably only useful when a model is being created and
    // we want to add stuff on.
    repl_run.context['model_id'] = resp.model_id();

    // Add the response back into the REPL environment.
    repl_run.context['response'] = resp;
}

// Generic way of handling problems during responses.
function _bad_response_handler(type, resp, man){

    // Deliver a mostly coherent error message.
    console.error('\n');
    console.error('There was a '+ type + ' (' +
		  resp.message_type() + '): ' + resp.message());
    console.error('\n');

    // If the response id defined, assign it back into the REPL.
    repl_run.context['response'] = resp;
}

// "prerun" callback.
manager.register('prerun', function(){
    console.log('Starting...');
});

// "postrun" callback.
manager.register('postrun', function(){
    console.log('Completed.');
});

// "manager_error" callback.
manager.register('manager_error', function(resp, man){
    _bad_response_handler('manager error', resp, man);
});

// "error" callback.
manager.register('error', function(resp, man){
    _bad_response_handler('error', resp, man);
});

// "warning" callback.
manager.register('warning', function(resp, man){
    _bad_response_handler('warning', resp, man);
});

// "meta" callback.
manager.register('meta', function(resp, man){
    _good_response_handler(resp);
});

// "merge" callback.
manager.register('merge', function(resp, man){
    _good_response_handler(resp);
});

// "rebuild" callback.
manager.register('rebuild', function(resp, man){
    _good_response_handler(resp);
});

///
/// Activites.
///

/**
 * Make best effort to show the structure of the given object.
 */
function show(x){
    if( x && x.structure ){
	console.log(JSON.stringify(x.structure(), null, ' '));
    }else{
	console.log(JSON.stringify(x, null, ' '));
    }
}

/** Union of given class expressions. */
var union = class_expression.union;

/** Intersection of given class expressions. */
var intersection = class_expression.intersection;

/** SVF attempt. */
var svf = class_expression.svf;

/** Best attempt to contsruct class expressions. */
var cls = class_expression.cls;

function get_meta(){

    // Construct.
    request_set = new minerva_requests.request_set(token);
    request_set.get_meta();

    _request_and_save(manager, request_set);
}

// Can be used to switch models, as well as view the current one.
function get_model(mid){
    if( ! mid ){
	mid = _get_current_model_id();
    }

    // Construct.
    request_set = new minerva_requests.request_set(token);
    request_set.get_model(mid);

    _request_and_save(manager, request_set);
}

// 
function add_model(){

    // Construct.
    request_set = new minerva_requests.request_set(token);
    request_set.add_model();

    _request_and_save(manager, request_set);
}

function add_individual(cls_expr, ind_id){
    var mid = _get_current_model_id();
    
    // Construct.
    request_set = new minerva_requests.request_set(token, mid);
    request_set.add_individual(cls_expr, ind_id);

    _request_and_save(manager, request_set);
}

/** Create a custom request set from the current environment. */
function new_request_set(){
    var mid = _get_current_model_id();

    var reqs = new minerva_requests.request_set(token, mid);

    return reqs;
}

/** Add a custom request set; probably necessary for linking. */
function request_with(req_set){
    _request_and_save(manager, req_set);
}

///
/// Export important things to REPL environment.
///

var export_context =
	[
	    // Helpers.
	    'bbop',
	    //'bbopx',
	    'manager',
	    // Auto-variables
	    'token',
	    'model_id',
	    'request_set',
	    'response',
	    'query_url',
	    // Actions.
	    'show',
	    'union',
	    'intersection',
	    'svf',
	    'cls',
	    'get_meta',
	    'get_model',
	    'add_model',
	    'add_individual',
	    'new_request_set',
	    'request_with'
	];
each(export_context, function(symbol){
    eval("repl_run.context['"+symbol+"'] = "+symbol+";");
});

///
/// REPL examples as we move forward with testing.
///

// get_meta();

// model_id = 'gomodel:taxon_9606-5539842e0000002'
// add_individual('GO:0022008');
// add_individual(intersection(['GO:0022008', 'GO:0008150']))

// add_model()
// var r = new_request_set()
// r.add_fact([r.add_individual('GO:0022008'), r.add_individual('GO:0008150'), 'part_of'] )
// request_with(r)

// get_model('gomodel:taxon_559292-5525a0fc0000001_all_indivdual')
// request_with(new_request_set().add_annotation_to_fact('comment', 'foo', ['gomodel:taxon_559292-5525a0fc0000001-GO-0005515-5525a0fc0000023','gomodel:taxon_559292-5525a0fc0000001-GO-0005095-5525a0fc0000009','RO:0002408']));

// get_model('gomodel:taxon_559292-5525a0fc0000001_all_indivdual')
// request_with(new_request_set().add_evidence('ECO:0000034', 'NEMO:0000001', ['gomodel:taxon_559292-5525a0fc0000001-GO-0005095-5525a0fc0000009','gomodel_taxon_559292-5525a0fc0000001-SGD-S000003814-553ff9ed0000002','RO:0002333']));

// get_model('gomodel:taxon_559292-5525a0fc0000001_all_indivdual')
// request_with(new_request_set().remove_type_from_individual(cls('SGD:S000003814'), 'gomodel_taxon_559292-5525a0fc0000001-SGD-S000003814-553ff9ed0000002'));
// request_with(new_request_set().add_type_to_individual(cls('SGD:S000003814'), 'gomodel_taxon_559292-5525a0fc0000001-SGD-S000003814-553ff9ed0000002'));
// request_with(new_request_set().add_type_to_individual(cls('SGD:S000003815'), 'gomodel_taxon_559292-5525a0fc0000001-SGD-S000003814-553ff9ed0000002'));

///
/// Some internal testing.
///

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
