////
//// Save all models, useful when doing bulk updates through minerva.
//// 
//// Example:
////  node bulk-save.repl.js --
////  node ./bin/noctua-repl.js --token=123 --server http://localhost:3400 --definition minerva_local --file ./scripts/bulk-save.repl.js --batch-size 5 --window-number 1
////

// Let jshint pass over over our external globals (browserify takes
// care of it all).
/* global get_meta */
/* global response */
/* global manager */
/* global argv */

///
/// Helpers and aliases.
///

var us = require('underscore');

var each = us.each;

function ll(arg1){
    console.log('bulk-save.repl.js:', arg1); 
}

function _die(message){
    console.error('bulk-save.repl.js:' + message);
    process.exit(-1);
}

///
/// CLI handling, environment setup, and initialization of clients.
///

// // CLI handling.
// var argv = require('minimist')(process.argv.slice(2));

// How many we'll do in a single go.
var batch_size = argv['b'] || argv['batch-size'];
if( ! batch_size ){
    batch_size = 10;
    ll('Will default to batch-size of ' + batch_size);
}else{
    ll('Will use batch-size of ' + batch_size);
}

// Essentially the offset: batch_size * window number.
var window_number = argv['w'] || argv['window-number'];
if( ! window_number ){
    window_number = 1;
    ll('Will run the first "window"');
}else{
    ll('Will run window ' + window_number);
}

// Get start and end.
var start_index = (window_number * batch_size) - batch_size;
var end_index = (window_number * batch_size) - 1;
ll('Will process indexes: ' + start_index + ' - ' + end_index);

// Using magical environmental globals here.
get_meta();
var models_meta_ro = response.models_meta_read_only();

var index = 0;
us.each(models_meta_ro, function(meta, mid){

    if( index >= start_index && index <= end_index  ){
	ll('Start saving: ' + mid);
	manager.store_model(mid);
	ll('Done saving: ' + mid);
    }else{
	ll('Skipping: ' + mid);
    }

    index++;
});
