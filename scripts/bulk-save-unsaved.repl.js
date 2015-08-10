///
/// Save all unsaved models.
/// 

var batch_size = 10;

get_meta();

var models_meta_ro = response.models_meta_read_only();

var count = 1;
each(models_meta_ro, function(meta, mid){

    if( models_meta_ro[mid]['modified-p'] ){
	console.log('Start saving: ' + mid);
	manager.store_model(mid);
	console.log('Done saving: ' + mid);

	if( count === batch_size ){
	    process.exit(0);
	}
	count++;
    }

});
