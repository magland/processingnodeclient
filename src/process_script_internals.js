/*********** process_script internals.js ******************/


if (typeof(run)!='undefined') exports.run=run;
else if (typeof(__pipeline_run)!='undefined') exports.run=__pipeline_run;
else {
	throw new Error('run function not found.');
}

function submitProcess(process) {
	return internal_functions.submitProcess(process);
}
/*function getProcessingStatus(params,callback) {
	return internal_functions.getProcessingStatus(params,callback);
}*/

var internal_functions={
	submitProcess:function() {console.error('unexpected error: submitProcess not implemented');}
	//getProcessingStatus:function() {console.error('unexpected error: getProcessingStatus not implemented');}
};
exports.internal_functions=internal_functions;

/****************************************************************/