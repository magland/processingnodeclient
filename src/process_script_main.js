
var create_wisdm_processor=require('./create_wisdm_processor').create_wisdm_processor;
var internal_functions=require('./custom_script').internal_functions;
var common=require('./common').common;
var WISDMUSAGE=require('./wisdmusage').WISDMUSAGE;

WISDMUSAGE.setCollectionName('processing_script');

internal_functions.submitProcess=submitProcess;
//internal_functions.getProcessingStatus=getProcessingStatus;

var script_info=require('./custom_script').script_info||{};
var processing_node_id=script_info.processing_node_id;
var script_id=script_info.script_id;
var user_id=script_info.user_id;
var run_parameters=script_info.run_parameters||{};

var WISDM_SUBMITTED_PROCESSES={};
var WISDM_SUBMITTED_PROCESS_LIST=[]; //so we can keep track of the order of submission

//////////////////////////////////////////////////////
require('./custom_script').run(run_parameters);
//////////////////////////////////////////////////////

var num_processes=0;
for (var key in WISDM_SUBMITTED_PROCESSES) num_processes++;

add_script_to_database(function(tmp0) {
	if (!tmp0.success) {
		console.error('Problem adding script to database: '+tmp0.error);
	}

	console.log ('Submitting '+num_processes+' processes...');
	submit_all_processes(function(tmp) {
		if (!tmp.success) {
			console.error('Problem submitting processes: '+tmp.error);
			process.exit(1);
		}
		else {
			finalize_and_write_submitted_processes(tmp.previous_statuses);
		}
	});
});

function finalize_and_write_submitted_processes(previous_statuses) {
	console.log ('Writing output...');
	WISDM_SUBMITTED_PROCESS_LIST.forEach(function(PP) {
		if (PP.process_id in previous_statuses) {
			PP.previous_status=previous_statuses[PP.process_id];
		}
	});
	common.write_text_file(__dirname+'/wisdm_submitted_processes.json',JSON.stringify(WISDM_SUBMITTED_PROCESS_LIST));
	console.log ('Done submitting processes.');
	
	WISDMUSAGE.writePendingRecords(function() {
		setTimeout(function() {
			process.exit(0);
		},100);
	});
}

///////////////////////////////////////////////

function disp(str) {
	console.log (str);
}

///////////////////////////////////////////////


function open_database(callback) {
	var ProcessDatabase=require('./processdatabase').ProcessDatabase;
	var database_name=processing_node_id;
	var PROCESS_DATABASE=new ProcessDatabase();
	PROCESS_DATABASE.setDatabaseName(database_name);
	callback(PROCESS_DATABASE);
}


function submit_all_processes(callback) {
	open_database(function(DB) {
		if (!DB) {
			callback({success:false,error:'Unable to open database.'});
			return;
		}
		DB.addProcesses(WISDM_SUBMITTED_PROCESSES,{user_id:user_id},function(tmp2) {
			callback(tmp2);
		});
	});
}

function add_script_to_database(callback) {
	open_database(function(DB) {
		if (!DB) {
			callback({success:false,error:'Unable to open database.'});
			return;
		}
		var script_record={
			script_id:script_id,
			user_id:user_id,
			num_processes:num_processes
		};
		DB.addScriptRecord(script_record,function(tmp) {
			if (!tmp.success) {callback(tmp); return;}
			callback({success:true});
		});
	});
}

//////////////////////////////////////////////////

function make_clean_input_file(input_file) {
	var tmp={};
	if (input_file.file_type) tmp.file_type=input_file.file_type;
	if (input_file.process_id) tmp.process_id=input_file.process_id;
	if (input_file.output_name) tmp.output_name=input_file.output_name;
	if (input_file.content) tmp.content=input_file.content;
	return tmp;
}

function submitProcess(process) {
	process.processor=create_wisdm_processor(process.processor||{});
	
	if (!process.input_files) process.input_files={};
	
	//only certain fields are allowed in the input_files
	//in particular we don't want processing_node_id in here!
	var clean_input_files={};
	for (var input_file_name in process.input_files) {
		var input_file=process.input_files[input_file_name];
		if (input_file.length) {
			//the input file is actually a list of files
			var tmp=[];
			for (var i=0; i<input_file.length; i++) {
				tmp.push(make_clean_input_file(input_file[i]));
			}
			clean_input_files[input_file_name]=tmp;
		}
		else {
			clean_input_files[input_file_name]=make_clean_input_file(input_file);
		}
	}
	process.input_files=clean_input_files;
	
	process.script_id=script_id;
	
	process.process_id=create_process_id(process);
	WISDM_SUBMITTED_PROCESSES[process.process_id]=process;
	WISDM_SUBMITTED_PROCESS_LIST.push({
		process_id:process.process_id,
		processor_name:(process.processor||{}).processor_name
	});
	
	var processor=process.processor||{};
	var output_files=processor.output_files||{};
	var outputs={};
	for (var output_name in output_files) {
		var output_file=output_files[output_name];
		outputs[output_name]={process_id:process.process_id,output_name:output_name,file_type:output_file.file_type,processing_node_id:processing_node_id};
	}
	return {process_id:process.process_id,outputs:outputs};
}

function create_process_id(process) {
	var tmp={
		processor_id:process.processor.processor_id,
		input_parameters:process.input_parameters,
		input_files:process.input_files
	};
	return compute_sha1(JSON.stringify(tmp));
}
function compute_sha1(str) {
	var crypto=require('crypto');
	var ret=crypto.createHash('sha1');
	ret.update(str);
	return ret.digest('hex');
}



