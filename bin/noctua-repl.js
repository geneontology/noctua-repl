////
//// REPL environment for Noctua.
////
//// See README.md for more information.
////

// Util.
var bbop = require('bbop-core');
var fs = require('fs');
var us = require('underscore');
var util = require('util');
var repl = require('repl');

//
// Tried to use https://github.com/tmpvar/repl.history, but it failed
// What follows has been adapted from https://github.com/tmpvar/repl.history
//
//  Suggested improvements that should be done:
//    Write the history out after each 'line', rather than waiting for exit. That way, a crash
//    won't lose the history that produced it.
//
var repl_history = function (repl, file) {  // for some reason, require('repl_history') doesn't work here.
  try {
    var stat = fs.statSync(file);
    var fileContents = fs.readFileSync(file, 'utf-8') + '';

    repl.rli.history = fileContents.split('\n').reverse();
    repl.rli.history.shift();
    var historyIndex = -1;
    repl.rli.historyIndex = historyIndex; // -1; // will be incremented before pop
  } catch (e) {
      // Pass.
  }

  var fd = fs.openSync(file, 'a');
  var reval = repl.eval;

  repl.rli.addListener('line', function(code) {
    if (code === '.history') {
      // console.log('HISTORY');
    }
    else if (code.length > 0) {
      // console.log('WRITE');
	fs.write(fd, code + '\n', function(){});
    }
    else {
      // console.log('ELSE');
    }
  });

  process.on('exit', function() {
    fs.closeSync(fd);
  });

  repl.commands['history'] = {
    help : 'Show the history',
    action : function() {
      var out = [];
      repl.rli.history.forEach(function(v, k) {
        out.push(v);
      });
      repl.outputStream.write(out.reverse().join('\n') + '\n');
      repl.displayPrompt();
    }
  };
};

var barista_response = require('bbop-response-barista');
var class_expression = require('class-expression');
var minerva_requests = require('minerva-requests');
var noctua_model = require('bbop-graph-noctua');

// Minerva (model affecting) communication.
var sync_engine = require('bbop-rest-manager').sync_request;
var minerva_manager = require('bbop-manager-minerva');

// For JSON SPARQL ops.
var json_response = require('bbop-rest-response').json;
var sparql_manager = require('bbop-manager-sparql');

// Barista (telekinesis, etc.) communication.
var barista_client = require('bbop-client-barista');

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
    console.log('Using default Barista definition: ' + barista_definition);
}else{
    console.log('Using Barista definition: ' + barista_definition);
}

// The idea here is to be able to run a single command (line of
// javascript).
var command = argv['c'] || argv['command'] || null;
if( ! command || what_is(command) !== 'string' ){
    // Is optional; pass.
}else{
    console.log('Run command: ' + command);
}

// The idea here is to be able to run a set of commands in the
// environment in batch.
// TODO: (optional) file
var file = argv['f'] || argv['file'];
if( ! file || what_is(file) !== 'string' ){
    // Is optional; pass.
}else{
    console.log('Run file: ' + file);
}

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

function _get_current_model(){
    var m = repl_run.context['model'] || model;
    return m;
}

// Make the request and save the interesting products.
function _request_and_save(manager, request_set){

    // Capture the incoming request.
    repl_run.context['request_set'] = request_set;

    // Request, let the synchonous callbacks deal with with happens.
    return manager.request_with(request_set);
}

///
/// Add Minerva manager and default callbacks to repl.
///

//
var engine = new sync_engine(barista_response);
var manager = new minerva_manager(barista_server, barista_definition,
				  token, engine, 'sync');
var request_set = null;
var response = null;
var model = null;
var model_id = null;
var query_url = null;

// Try and make a general "good" response.
function _good_response_handler(resp){

    // "Display" the returning data.
    show(resp.data());

    // Extract any model ID and assign it to the environment as the
    // default--probably only useful when a model is being created and
    // we want to add stuff on.
    var mid = resp.model_id();
    if( mid ){
	model_id = mid;
	repl_run.context['model_id'] = mid;
    }else{
	model_id = null;
	repl_run.context['model_id'] = null;
    }

    // If there are models, set them up in the environment.
    var pre_model = new noctua_model.graph();
    var d = resp.data();
    if( d && pre_model.load_data_basic(d) ){
	model = pre_model;
	repl_run.context['model'] = pre_model;
    }else{
	model = null;
	repl_run.context['model'] = null;
    }

    // Add the response back into the REPL environment.
    repl_run.context['response'] = resp;
    response = resp;

    // TODO: can we easily extract this still? Probably not, what with
    // all the POST and engine abstractions we have now. OTOH, it's
    // easier to push tests upstream.
    repl_run.context['query_url'] = null;
}

// Generic way of handling problems during responses.
function _bad_response_handler(type, resp, man){

    // Deliver a mostly coherent error message.
    console.error('\n');
    console.error('There was a '+ type + ' (' +
		  resp.message_type() + '): ' + resp.message());
    // Sometimes we get more information.
    if( resp.commentary() ){
	console.error(resp.commentary());
    }
    console.error('\n');

    // If the response is defined, assign it back into the REPL.
    repl_run.context['response'] = resp;
}

// "prerun" callback.
manager.register('prerun', function(){
    console.log('Starting...');
});

// "postrun" callback.
manager.register('postrun', function(){
    //console.log('Completed.');
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
/// Add SPARQL manager and default callbacks to repl.
///

var sparql_engine = new sync_engine(json_response);
sparql_engine.headers([['accept', 'application/sparql-results+json']]);
var sparql = new sparql_manager('http://rdf.geneontology.org/sparql',
				[],
				json_response,
				sparql_engine,
				'async');

var sparql_response = null;

// Try and make a general "good" response.
function _good_sparql_response_handler(resp, man){

    console.log('resp', resp);

    // "Display" the returning data.
    show(resp.raw());

    // Add the response back into the REPL environment.
    repl_run.context['sparql_response'] = resp;
    sparql_response = resp;
}

// Generic way of handling problems during responses.
function _bad_sparql_response_handler(resp, man){

    // Deliver a mostly coherent error message.
    console.error('\n');
    console.error('There was a ('+ resp.message_type() +'): '+ resp.message());
    // Sometimes we get more information.
    if( resp.commentary() ){
	console.error(resp.commentary());
    }
    console.error('\n');

    // If the response is defined, assign it back into the REPL.
    repl_run.context['sparql_response'] = resp;
}

// "error" callback.
sparql.register('error', function(resp, man){
    _bad_sparql_response_handler(resp, man);
});

// "success" callback.
sparql.register('success', function(resp, man){
    _good_sparql_response_handler(resp, man);
});

///
/// Add Barista manager and default callbacks to repl.
///

var barclient = new barista_client(barista_server, token);
barclient.logger(false); // turn off irritating log messages early

///
/// Activites.
///

/**
 * Make best effort to show the structure of the given object.
 */
var SILENT = false;
function show(x){
    if( ! SILENT ){
	if( x && x.structure ){
	    console.log(JSON.stringify(x.structure(), null, ' '));
	}else{
	    console.log(JSON.stringify(x, null, ' '));
	}
    }
}

/** Run sparql templates off the filesystem. */
function sparql_template(path, vars){

    // Bring in YAML example.
    var inyml = fs.readFileSync(path).toString();

    // Request, let the synchonous callbacks deal with with happens.
    return sparql.template(inyml, vars);
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

    return _request_and_save(manager, request_set);
}

// Can be used to switch models, as well as view the current one.
function get_model(mid){
    if( ! mid ){
	mid = _get_current_model_id();
    }

    // Bind the barista client to this model.
    if( barclient && barclient.okay() ){
	barclient.connect(mid);
    }

    // Construct.
    request_set = new minerva_requests.request_set(token);
    request_set.get_model(mid);

    return _request_and_save(manager, request_set);
}

//
function add_model(){

    // Construct.
    request_set = new minerva_requests.request_set(token);
    request_set.add_model();

    return _request_and_save(manager, request_set);
}

function save_model(mid){
    if( ! mid ){
	mid = _get_current_model_id();
    }

    // Construct.
    request_set = new minerva_requests.request_set(token);
    request_set.store_model(mid);

    return _request_and_save(manager, request_set);
}

function add_individual(cls_expr, ind_id){
    var mid = _get_current_model_id();

    // Construct.
    request_set = new minerva_requests.request_set(token, mid);
    request_set.add_individual(cls_expr, ind_id);

    return _request_and_save(manager, request_set);
}

function move_individual(ind_id, x, y){
    var mid = _get_current_model_id();
    var m = _get_current_model();

    // Construct.
    request_set = new minerva_requests.request_set(token, mid);

    request_set.update_annotations(m, 'hint-layout-x', x);
    request_set.update_annotations(m, 'hint-layout-y', y);

    return _request_and_save(manager, request_set);
}

/** Create a custom request set from the current environment. */
function new_request_set(){
    var mid = _get_current_model_id();

    var reqs = new minerva_requests.request_set(token, mid);

    return reqs;
}

/** Add a custom request set; probably necessary for linking. */
function request_with(req_set){
    return _request_and_save(manager, req_set);
}

function silent(bool){
    if( bool && bool === true ){
	SILENT = true;
    }else{
	SILENT = false;
    }
}

/**
 *
 */
function show_models(order_by){

    // Quietly get the meta information.
    silent(true);
    var meta_resp = manager.get_meta();
    silent(false);

    // Data capture step.
    var cache = [];
    var models_meta = meta_resp.models_meta();
    each(models_meta, function(annotations, mid){

	// Collect and bin all the annotations.
	var key_to_value_list = {};
	each(annotations, function(ann){
	    var k = ann['key'];
	    // Ensure list.
	    if( typeof(key_to_value_list[k]) === 'undefined' ){
		key_to_value_list[k] = [];
	    }
	    key_to_value_list[k].push(ann['value']);
	});

	// Create the final (sortable) strings.
	// Annotations we care about.
	var title = '<no title>';
	var date = '????-??-??';
	var contributor = '???';
	var state = '???';
	var modified_p = ' ';
	var deprecated = ' ';
	var template = ' ';
	if( key_to_value_list['title'] ){
	    title = key_to_value_list['title'].join("|");
	}
	if( key_to_value_list['date'] ){
	    date = key_to_value_list['date'].join("|");
	}
	if( key_to_value_list['contributor'] ){
	    contributor = key_to_value_list['contributor'].join("|");
	}
	if( key_to_value_list['state'] ){
	    state = key_to_value_list['state'].join("|");
	}
	if( key_to_value_list['template'] ){
	    template = key_to_value_list['template'].join("|");
	}
	if( key_to_value_list['deprecated'] ){
	    deprecated = key_to_value_list['deprecated'].join("|");
	}

	cache.push({
	    'id': mid,
	    'date': date,
	    'modified-p': modified_p,
	    'state': state,
	    'template': template,
	    'deprecated': deprecated,
	    'contributor': contributor,
	    'title': title
	});
    });

    // Now get the information from the "read-only" stream of
    // key/values.
    var models_meta_ro = meta_resp.models_meta_read_only();
    each(cache, function(item){
	var mid = item['id'];
	if( models_meta_ro && models_meta_ro[mid] ){
	    if( models_meta_ro[mid]['modified-p'] ){
		//item['modified-p'] = models_meta_ro['id']['modified-p'];
		//console.log('add mod 4 ' + mid);
		item['modified-p'] = '*';
	    }
	}
    });

    // Optional sorting step.
    if( order_by ){
	cache = cache.sort(function(a, b){
	    var cmp_a = a[order_by].toLowerCase();
	    var cmp_b = b[order_by].toLowerCase();
	    if( cmp_a > cmp_b ){
		return 1;
	    }else if( cmp_a === cmp_b ){
		return 0;
	    }else{
		return -1;
	    }
	});
    }

    // Display the info nicely.
    each(cache, function(item){
	console.log([
	    //item['id'] + ' ' + item['date'] + ' ' + item['modified'] + ' ' + item['deprecated'],
	    item['id'],
	    item['date'],
	    item['modified-p'],
	    item['state'],
	    item['template'],
	    item['deprecated'],
	    item['contributor'],
	    item['title'],
	].join("\t"));
    });
}

/**
 *
 */
function show_response(){

    var col = 15;

    // Already have it or not.
    if( response ){
	var out = {
	    'okay': response.okay(),
	    'user-id': response.user_id(),
	    'provided-by': response.groups(),
	    'message_type': response.message_type(),
	    'message': '"' + response.message() + '"',
	    'signal': response.signal(),
	    'intention': response.intention(),
	    'modified-p': response.modified_p(),
	    'inconsistent': response.inconsistent_p(),
	    'has_undo': response.has_undo_p(),
	    'has_redo': response.has_redo_p(),
	    'facts': response.facts().length,
	    'individuals': response.individuals().length,
	    'evidence': response.evidence().length
	};

	each(out, function(val, key){

	    //
	    var spacing = col - key.length;
	    if( spacing <= 0 ){ spacing = 1; }

	    var spaces = '';
	    each(us.range(spacing), function(){
		spaces += ' ';
	    });
	    console.log(key + spaces + val);
	});

    }
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

repl_history(repl_run, process.env.HOME + '/.noctua_repl_history');


///
/// Export important things to REPL environment.
///

var export_context =
	[
	    // Script environment.
	    'argv',
	    // Helpers.
	    'bbop',
	    'us',
	    'util',
	    'manager',
	    'sparql',
	    'show',
	    'barclient',
	    // Auto-variables
	    'token',
	    'model',
	    'model_id',
	    'request_set',
	    'response',
	    'query_url',
	    'sparql_response',
	    // Class expressions.
	    'union',
	    'intersection',
	    'svf',
	    'cls',
	    // Manager actions.
	    'get_meta',
	    'get_model',
	    'add_model',
	    'save_model',
	    'add_individual',
	    'new_request_set',
	    'request_with',
	    // SPARQL manager actions.
	    'sparql_template',
	    // Bigger fun macros.
	    'show_models',
	    'show_response',
	    'silent',
	    // Model macros.
	    'move_individual'
	];
each(export_context, function(symbol){
    eval("repl_run.context['"+symbol+"'] = "+symbol+";");
});

///
/// Run command or file in our environment.
///

if( command ){

    // Run command.
    console.log('');
    //console.log('command: ', command);
    eval(command + ";");

    // Exit.
    process.exit(0);
}

if( file ){

    fs.readFile(file, function (err, data) {
	if(err){ throw err; }

	//console.log(data);

	// Run file.
	//console.log()
	eval(data.toString());

	// Exit.
	process.exit(0);
    });
}

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
// request_with(new_request_set().add_annotation_to_fact('comment', 'foo', null, ['gomodel:taxon_559292-5525a0fc0000001-GO-0005515-5525a0fc0000023','gomodel:taxon_559292-5525a0fc0000001-GO-0005095-5525a0fc0000009','RO:0002408']));

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
