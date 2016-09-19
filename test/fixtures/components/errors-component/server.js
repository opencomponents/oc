'use strict';

module.exports.data = function(context, callback){

	if(context.params.errorType === 'timeout'){
		setTimeout(function() {
			callback(null, {
				error: true,
				timeout: true
			});
		}, context.params.timeout || 2000);
	} else if(context.params.errorType === '500'){
		callback(500);
	} else {

	  callback(null, {
	  	error: false
	  });
	}
};