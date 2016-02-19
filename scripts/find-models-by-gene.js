////
//// Get model information for 
////

var batch_size = 10;

get_meta();

var mids = response.model_ids();

var key = 'state';
var value = 'development';
var value_type = null;

var count = 1;
us.each(mids, function(mid){
    get_model(mid);

    // Decide whether or not to update a model
    var update_p = true;
    var current_anns = model.get_annotations_by_key(key);
    us.each(current_anns, function(ann){
	if( ann.key() === key && ann.value() === value ){
	    update_p = false;
	}
    });

    // Update if necessary.
    if( update_p ){
	silent(false);
	manager.update_annotations(mid, model, key, value, value_type);
	silent(true);

	if( count === batch_size ){
	    process.exit(0);
	}
	count++;
    }

});
