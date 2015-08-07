///
/// Save all unsaved models.
/// 

get_meta();

var models_meta_ro = response.models_meta_read_only();

var ten_count = 1;
each(models_meta_ro, function(meta, mid){

    if( models_meta_ro[mid]['modified-p'] ){
	console.log('Start saving: ' + mid);
	manager.store_model(mid);
	console.log('Done saving: ' + mid);
    }

    if( ten_count === 10 ){
	process.exit(0);
    }
    ten_count++;
});
