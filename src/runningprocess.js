var common=require('./common').common;
var spawn=require('child_process').spawn;
var fs=require('fs');

function RunningProcess() {
	var that=this;
	
	this.setProcess=function(process) {m_process=common.extend(true,{},process);};
	this.setProcessor=function(processor) {m_processor=processor;};
	this.setProcessWorkingPath=function(path) {m_process_working_path=path;};
	this.setProcessorWorkingPath=function(path) {m_processor_working_path=path;};
	this.setProcessDatabase=function(db) {m_process_database=db;};
	this.setDataFilePath=function(path) {m_data_file_path=path;};
	this.start=function(callback) {_start(callback);};
	this.processOutput=function() {return m_process_output;};
	this.processStatus=function(callback) {return m_process_status;};
	this.processError=function(callback) {return m_process_error;};
	this.outputFiles=function() {return m_output_files;};
	this.process=function() {return m_process;};
	this.processor=function() {return m_processor;};
	this.timeLaunched=function() {return m_time_launched;};
	
	var m_process={};
	var m_processor={};
	var m_process_working_path='';
	var m_processor_working_path='';
	var m_data_file_path='';
	var m_process_database=null;
	var m_spawned_process=null;
	var m_process_output='';
	var m_process_completed_handlers=[];
	var m_process_status='not_started';
	var m_process_error='';
	var m_output_files={};
	var m_time_launched=null;
	
	function report_error(callback,errstr) {
		console.error('ERROR: '+errstr);
		if (callback) callback({success:false,error:errstr});
	}
		
	function _start(callback) {
		console.log ('STARTING PROCESS: '+(m_processor.processor_name||''));
		m_process_status='_start';
		
		if (!m_process_working_path) {
			report_error(callback,'process working path is empty.');
			return;
		}
		if (!m_processor_working_path) {
			report_error(callback,'processor working path is empty.');
			return;
		}
		if (!m_data_file_path) {
			report_error(callback,'data file path is empty.');
			return;
		}
		if (!m_process_database) {
			report_error(callback,'process database is null.');
			return;
		}
		
		var process_collection=m_process_database.collection('processes');
		
		make_directories(function(tmp) {
			if (!tmp.success) {callback(tmp); return;}
			create_input_parameters(function(tmp) {
				if (!tmp.success) {callback(tmp); return;}
				create_input_files(function(tmp) {
					if (!tmp.success) {callback(tmp); return;}
					start_process(function(tmp) {
						if (!tmp.success) {callback(tmp); return;}
						callback({success:true});
					});
				});
			});
		});
		
		function start_process(callback) {
			if (!m_process_database) {
				report_error(callback,'process database is null (*).');
				return;
			}
			
			m_time_launched=new Date();
			m_process_status='start_process';
			m_spawned_process=spawn('/bin/bash',[m_processor_working_path+'/main.sh',m_processor_working_path],{cwd:m_process_working_path});
			callback({success:true});
			
			var pid=m_spawned_process.pid;
			var CC=m_process_database.collection('processes');
			CC.update({_id:m_process._id},{$set:{pid:pid}},function(err) {
				if (err) {
					console.error('Problem setting pid in database: '+err);
				}
			});
			
			m_spawned_process.stdout.on('data',function(data) {
				m_process_output+=data;
			});
		
			m_spawned_process.stderr.on('data', function (data) {
				m_process_output+=data;
			});
			
			m_spawned_process.on('close', function (code) {
				m_process_output+='Process exited with code ' + code;
				on_process_closed();
			});
		}
		
		function make_directories(callback) {
			m_process_status='make_directories';
			common.mkdir(m_process_working_path+'/input_parameters',function(tmp) {
				if (!tmp.success) {callback(tmp); return;}
				common.mkdir(m_process_working_path+'/input_files',function(tmp) {
					if (!tmp.success) {callback(tmp); return;}
					common.mkdir(m_process_working_path+'/output_files',function(tmp) {
						if (!tmp.success) {callback(tmp); return;}
						callback({success:true});
					});
				});
			});
		}
		
		function create_input_parameters(cb_create_input_parameters) {
			m_process_status='create_input_parameters';
			var input_parameters=m_process.input_parameters||{};
			var input_parameter_names=[];
			for (var key in input_parameters) input_parameter_names.push(key);
			common.for_each_async(input_parameter_names,function(input_parameter_name,cb) {
				var input_parameter=input_parameters[input_parameter_name];
				var path=m_process_working_path+'/input_parameters/'+input_parameter_name+'.txt';
				common.write_text_file(path,input_parameter.value||'',function(tmp) {
					if (!tmp.success) {cb(tmp); return;}
					cb({success:true});
				});
			},cb_create_input_parameters,5);
		}
		
		function create_input_files(cb_create_input_files) {
			m_process_status='create_input_files';
			var input_files=m_process.input_files||{};
			var input_file_names=[];
			for (var key in input_files) input_file_names.push(key);
			common.for_each_async(input_file_names,function(input_file_name,cb) {
				var input_file=input_files[input_file_name];
				var path=m_process_working_path+'/input_files/'+input_file_name+'.'+input_file.file_type;
				if (input_file.content) {
					common.write_text_file(path,input_file.content,function(tmp) {
						if (!tmp.success) {
							report_error(cb,'Unable to write input file: '+input_file_name);
							return;
						}
						cb({success:true});
					});
				}
				else if (input_file.process_id) {
					process_collection.find({_id:input_file.process_id}).toArray(function(err,docs) {
						if ((err)||(docs.length===0)) {
							report_error(cb,'Unable to find process for input file: '+input_file_name);
							return;
						}
						if (docs.length>1) {
							report_error(cb,'Unexpected error, found more than one process with id: '+input_file.process_id);
							return;
						}
						var process0=docs[0];
						if (process0.status!='finished') {
							report_error(cb,'Unexpected error, process for input file is not finished: '+input_file_name);
							return;
						}
						var output_files0=process0.output_files||{};
						if (!(input_file.output_name in output_files0)) {
							report_error(cb,'Unexpected error, output name not found in process outputs: '+input_file.output_name);
							return;
						}
						var output_file0=output_files0[input_file.output_name];
						if (!(output_file0.checksum)) {
							report_error(cb,'Unexpected error, checksum not found in output of process: '+input_file.output_name);
							return;
						}
						hard_link_file(m_data_file_path+'/'+output_file0.checksum+'.'+output_file0.file_type,path,function(tmp) {
							if (!tmp.success) {
								report_error(cb,'Problem linking file while creating input: '+tmp.error);
								return;
							}
							cb({success:true});
						});						
					});
				}
				else {
					report_error(cb,'content and process_id are empty.');
				}
			},cb_create_input_files,5);
		}
	}
	
	function hard_link_file(srcpath,dstpath,callback) {
		fs.exists(srcpath,function(src_exists) {
			if (!src_exists) {
				report_error(callback,'in hard_link_file, srcpath does not exist: '+srcpath);
				return;
			}
			
			fs.exists(dstpath,function(dst_exists) {
				if (dst_exists) {
					fs.unlink(dstpath,function(err) {
						if (err) {
							report_error(callback,'in hard_link_file, unable to remove dstpath');
							return;
						}
						do_link();
					});
				}
				else {
					do_link();
				}
			});
			
			function do_link() {
				fs.link(srcpath,dstpath,function(err) {
					if (err) {
						report_error(callback,'in hard_link_file, unable to link files');
						return;
					}
					callback({success:true});
				});
			}
			
		});
	}
	
	function store_output_files(callback) {
		var output_files=m_processor.output_files||{};
		var output_file_names=[];
		for (var key in output_files) output_file_names.push(key);
		common.for_each_async(output_file_names,function(output_file_name,cb) {
			var output_file=output_files[output_file_name];
			var srcpath=m_process_working_path+'/output_files/'+output_file_name+'.'+output_file.file_type;
			common.get_file_checksum(srcpath,function(tmp) {
				if (!tmp.success) {
					report_error(cb,'Problem computing output file checksum: '+output_file_name); 
					return;
				}
				var checksum=tmp.checksum;
				var dstpath=m_data_file_path+'/'+checksum+'.'+output_file.file_type;
				hard_link_file(srcpath,dstpath,function(tmp) {
					if (!tmp.success) {
						report_error(cb,'Problem creating hard link for output file: '+tmp.error);
						return;
					}
					m_output_files[output_file_name]={
						checksum:checksum,
						file_type:output_file.file_type
					};
					cb({success:true});
				});
			});
		},finalize_store_output_files,5);
		
		function finalize_store_output_files(tmp) {
			callback(tmp);
		}
	}
	
	function read_status(callback) {
		common.read_text_file(m_process_working_path+'/status.txt',function(tmp) {
			callback(tmp.text||'');
		});
	}
	
	function on_process_closed() {
		m_process_status='on_process_closed';
		
		read_status(function(status0) {
			if (status0.indexOf('finished')===0) {
				store_output_files(function(tmp) {
					if (!tmp.success) {
						m_process_status='error';
						m_process_error='Problem storing output files: '+tmp.error;
						on_process_completed();
						return;
					}
					m_process_status='finished';
					on_process_completed();
				});
			}
			else if (status0.indexOf('error')===0) {
				m_process_status='error';
				m_process_error=status0.slice(('error:').length).trim();
				on_process_completed();
			}
			else {
				m_process_status='error';
				m_process_error='unrecognized status: '+status0;
				on_process_completed();
			}
		});
	}
	function on_process_completed() {
		for (var i=0; i<m_process_completed_handlers.length; i++) {
			m_process_completed_handlers[i]();
		}
	}
}

exports.RunningProcess=RunningProcess;