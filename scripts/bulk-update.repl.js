////
//// Experimental script for doing a bulk annotation update.
////

get_meta();

var mids = response.model_ids();

var ten_count = 1;
us.each(mids, function(mid){
    get_model(mid);

    var old_anns = model.get_annotations_by_key('model-state');
    // Add new state if nothing there.
    if( us.isEmpty(old_anns) ){
	console.log('Starting work on: ' + mid);
	manager.add_model_annotation(mid, 'model-state', 'development');
	console.log('Done work on: ' + mid);
    }

    if( ten_count === 10 ){
	process.exit(0);
    }
    ten_count++;
});
