///
/// Save all unsaved models.
/// 

get_meta();

var models_meta_ro = response.models_meta_read_only();
each(models_meta_ro, function(meta, mid){
    if( models_meta_ro[mid]['modified-p'] ){
	console.log('Start saving: ' + mid);
	manager.store_model(mid);
	console.log('Done saving: ' + mid);
    }
});
