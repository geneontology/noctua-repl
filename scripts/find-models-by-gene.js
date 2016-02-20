////
//// Get model information by gene product ID. 
////
//// This script demonstrates a two-pass asynchronous call set.
////
//// Usage:
////   node ./scripts/find-models-by-gene.js -g UniProtKB:Q9GYQ4
////

///
/// Libraries.
///

// Correct environment.
var bbop = require('bbop-core');
var amigo = require('amigo2');
var golr_conf = require('golr-conf');
var golr_manager = require('bbop-manager-golr');
var golr_response = require('bbop-response-golr');
var model = require('bbop-graph-noctua');

// Engine for use.
var node_engine = require('bbop-rest-manager').node;

// Std utils.
var us = require('underscore');

///
/// Variables and helpers.
///

// Global variables.
var endpoint_location = 'http://amigo-dev-golr.berkeleybop.org/';
var max_model_count = 11;

// Aliases.
var each = us.each;
var noctua_graph = model.graph;
var noctua_node = model.node;
var noctua_annotation = model.annotation;
var noctua_edge = model.edge;

// Helper: log.
function ll(arg1){
    console.log('[' + (new Date()).toJSON() + ']: ', arg1); 
}

// Helper: die.
function _die(message){
    console.error('ERROR [' + (new Date()).toJSON() + ']: ' + message);
    process.exit(-1);
}

///
/// Process command line arguments.
///

// CLI handling.
var argv = require('minimist')(process.argv.slice(2));

// What gene product ID will we operate on?
var gp_id = argv['g'] || argv['gene-product'];
if( ! gp_id ){
    _die('Option (g|gene-product) is required.');
}

///
/// First pass: get the models IDs from GOlr, if any.
///

// Construct context and manager.
var gconf = new golr_conf.conf(amigo.data.golr);
var meta_engine = new node_engine(golr_response);
var meta_manager =
	new golr_manager(endpoint_location, gconf, meta_engine, 'async');

// Restrict our search to the subset we're interested in.
meta_manager.set_personality('model_annotation');
meta_manager.add_query_filter('document_category', 'model_annotation');

// We just want models that have this gp.
meta_manager.add_query_filter('enabled_by', gp_id);

// We're not interested in the returned items, just the facet listing
// of the models. In fact, we'll return unlimited facets, no "real"
// results, and limit ourself to the "model" facet.
meta_manager.set_facet_limit(-1);
meta_manager.set_results_count(0);
meta_manager.facets(['model']); 

// Register the search, and the callback.
meta_manager.register('search', function(resp, man){
        
    // Collect the model IDs.
    var incoming_model_list = resp.facet_field('model');
    var models_found = [];
    if( us.isArray(incoming_model_list) ){
	each(incoming_model_list, function(model_facet_pair){
	    models_found.push(model_facet_pair[0]);
	});
    }

    // If there are collected IDs, batch get information about those
    // models. Otherwise bail out here.
    if( models_found.length === 0 ){
	_die('Could find no models for: ' + gp_id);
    }else{

	///
	/// This is the second part: now that we have a list of model
	/// IDs, we will get the model information available for them.
	///

    	// For the sake of ease, we'll create a new manager.
	var model_engine = new node_engine(golr_response);
	var model_manager =
		new golr_manager(endpoint_location, gconf, model_engine,'async');
    	model_manager.set_personality('model_annotation');
    	model_manager.set_facet_limit(0); // No longer want facets.
    	model_manager.set_results_count(max_model_count);
    	model_manager.set_targets(models_found, ['model']);
	
    	// On successful search, display a little model info.
    	model_manager.register('search', function(resp, man){
            
            // Look at all the models we got back.
	    var already_seen_model = {};
            each(resp.documents(), function(doc){

		if( doc && doc['model'] && doc['owl_blob_json'] ){
		    
		    // Check if we've seen it before.
		    if( ! already_seen_model[doc['model']] ){

			// Mark this model seen.
			already_seen_model[doc['model']] = true;
			
			// Grab model JSON and convert it into an operable
			// graph.
			var jobj = JSON.parse(doc['owl_blob_json']);
    			var graph = new noctua_graph();
			graph.load_data_basic(jobj);
						
			// The final thing that we'll do.
			//ll(graph.id());
    			ll('Node count: ' + graph.all_nodes().length);
		    }
		}
    	    });
    	});
	
    	// Trigger second action.
    	model_manager.search();
    }
});

// Trigger initial action.
meta_manager.search();
