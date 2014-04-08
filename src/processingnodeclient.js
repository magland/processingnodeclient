var WisdmSocket=require('./wisdmsocket').WisdmSocket;
var common=require('./common').common;
var submit_script=require('./submit_script').submit_script;
var ProcessDatabase=require('./processdatabase').ProcessDatabase;

var fs=require('fs');
var crypto=require('crypto');


function ProcessingNodeClient() {
	var that=this;
	
	this.setProcessingNodeId=function(id) {m_processing_node_id=id;};
	this.connectToServer=function(host,port,callback) {_connectToServer(host,port,callback);};
	this.disconnectFromServer=function() {_disconnectFromServer();};
	this.connectionAccepted=function() {return m_connection_accepted;};
	this.isConnected=function() {if (m_socket) return true; else return false;};
	this.setNodePath=function(path) {m_node_path=path;};
	this.initializeProcessDatabase=function(callback) {initialize_process_database(callback);};
	this.setHandleProcesses=function(val) {m_handle_processes=val;};
	this.checkPaths=function(callback) {_checkPaths(callback);};
	this.onClose=function(callback) {m_close_handlers.push(callback);};
	this.closeWhenReady=function() {m_close_when_ready=true;};
	
	var m_socket=null;
	var m_processing_node_id=null;
	var m_connection_accepted=false;
	var m_node_path='';
	var m_process_database=null;
	var m_handle_processes=false;
	var m_close_when_ready=false;
	var m_close_handlers=[];
	var m_last_action_timer=new Date();
	
	function initialize_process_database(callback) {
		mkdirs([m_node_path+'/_WISDM'],function() {
			mkdirs([m_node_path+'/_WISDM/working_processes',m_node_path+'/_WISDM/working_processors',m_node_path+'/_WISDM/data_files'],function() {
				initialize_process_database_2(callback);
			});
		});
	}
	
	function initialize_process_database_2(callback) {
		m_process_database=new ProcessDatabase();
		m_process_database.setProcessWorkingPath(m_node_path+'/_WISDM/working_processes');
		m_process_database.setProcessorWorkingPath(m_node_path+'/_WISDM/working_processors');
		m_process_database.setDataFilePath(m_node_path+'/_WISDM/data_files');

		setTimeout(function() {
			var database_name=m_processing_node_id; //change node1 to node name
			console.log ('Connecting to database: '+database_name);
			m_process_database.connect({database:database_name},function(tmp1) { 
				if (!tmp1.success) {
					if (callback) callback({success:false,error:'Unable to connect to database: '+database_name});
					return;
				}
				if (callback) callback({success:true});
				periodic_handle_processes();
			});
		},100);
	}
	
	function mkdirs(dirs,callback) {
		common.for_each_async(dirs,function(dirname,cb) {
			common.mkdir(dirname,cb);
		},callback,5);
	}
	
	function periodic_handle_processes() {
		if (!m_process_database) return;
		if (!m_handle_processes) {
			if (m_close_when_ready) {
				do_close();
				return;
			}
			setTimeout(periodic_handle_processes,1000);
			return;
		}
		
		m_process_database.handleProcesses(function(tmp) {
			var timeout_ms=3000;
			setTimeout(periodic_handle_processes,timeout_ms);
		});
	}
	
	function periodic_check() {
		if (m_close_when_ready) {
			var elapsed_since_last_action=(new Date())-m_last_action_timer;
			if (elapsed_since_last_action>1000) {
				if (m_process_database.runningProcessCount()===0) {
					do_close();
					return;
				}
			}
		}
		setTimeout(periodic_check,1000);
	}
	periodic_check();
	
	
	function do_close() {
		that.disconnectFromServer();
		that.setHandleProcesses(false);
		setTimeout(function() {
			m_close_handlers.forEach(function(handler) {handler();});
		},1000);
	}
	
	function _disconnectFromServer() {
		if (!m_socket) return;
		m_socket.disconnect();
	}
	function _connectToServer(host,port,callback) {
		m_socket=new WisdmSocket();
		console.log ('Connecting to '+host+' on port '+port);
		m_socket.connect(host,port,function(tmp1) {
			if (!tmp1.success) {
				m_socket=null;
				callback(tmp1);
				return;
			}
			console.log ('Connection established.');
			setTimeout(function() {
				if (!m_socket) return; //important!
				m_socket.sendMessage({
					command:'connect_as_processing_node',
					processing_node_id:m_processing_node_id
				});
			},1000);
			callback({success:true});
		});
		m_socket.onMessage(function(msg) {
			m_last_action_timer=new Date();
			process_message_from_server(msg);
		});
		m_socket.onClose(function() {
			m_socket=null;
			m_connection_accepted=false;
		});
	}
	function _checkPaths(callback) {
		common.mkdir(m_node_path,function(tmpA) {
			fs.exists(m_node_path,function(exists0) {
				if (!exists0) {
					callback({success:false,error:'Node path does not exist: '+m_node_path});
					return;
				}
				fs.stat(m_node_path,function(err,stat) {
					if (err) {
						callback({success:false,error:'Error in stat: '+err});
						return;
					}
					if (!stat.isDirectory()) {
						callback({success:false,error:'Node path is not a directory.'});
						return;
					}
					callback({success:true});
				});
			});
		});
	}
	
	function process_message_from_server(msg) {
		console.log('process_message_from_server',JSON.stringify(msg));
		
		if (!m_connection_accepted) {
			if (msg.command=='connection_accepted') {
				console.log ('CONNECTION ACCEPTED');
				m_connection_accepted=true;
			}
			else {
				console.error('Unexpected initial message from server: '+(msg.command||''));
				if (m_socket) m_socket.close();
			}
		}
		else {
			var server_request_id=msg.server_request_id||'';
			if (!server_request_id) {
				if (m_socket) m_socket.sendMessage({command:'error',message:'Unexpected empty server_request_id in messsage'});
				return;
			}
			else {
				try {
					handle_server_request(msg,function(resp) {
						resp.server_request_id=server_request_id;
						if (m_socket) m_socket.sendMessage(resp);
					});
				}
				catch(err) {
					console.error('Error handling server request: '+(msg.command||''));
					console.error(err);
					var resp={success:false,error:err.toString()};	
					resp.server_request_id=server_request_id;
					if (m_socket) m_socket.sendMessage(resp);
				}
			}
		}
	}
	
	function close_socket() {
		if (!m_socket) return;
		console.error('Closing socket.');
		m_socket.disconnect();
		m_socket=null;
	}	
	
	function is_valid_node_path(path) {
		if (!path) return false;
		return true;
	}
	
	
	function get_file_for_request(request,callback) {
		if ((request.checksum)&&(request.file_type)) {
			callback({success:true,checksum:request.checksum,file_type:request.file_type});
		}
		else if (request.path) {
			get_file_for_path(request.path,function(tmp) {
				if (!tmp.success) {
					callback(tmp); return;
				}
				callback({success:true,checksum:tmp.checksum,file_type:tmp.file_type});
			});
		}
		else if ((request.process_id)&&(request.output_name)) {
			get_file_for_process_output(request.process_id,request.output_name,function(tmp) {
				if (!tmp.success) {
					callback(tmp); return;
				}
				callback({success:true,checksum:tmp.checksum,file_type:tmp.file_type});
			});
		}
		else {
			callback({success:false,error:'Missing required fields in get_file_for_request()'});
		}
	}
	
	function get_file_for_path(path,callback) {
		callback({success:false,error:'get_file_for_path() not yet implemented.'});
	}
	
	function get_file_for_process_output(process_id,output_name,callback) {
		if (!m_process_database) {
			callback({success:false,error:'process database is null'});
			return;
		}
		m_process_database.getProcessRecord(process_id,{status:1,output_files:1},function(tmp) {
			if (!tmp.success) {
				callback(tmp); return;
			}
			var record=tmp.record||{};
			var status=record.status||'';
			var output_files=record.output_files||{};
			
			if (status!='finished') {
				callback({success:false,error:'process status is not finished: '+status});
				return;
			}
			
			if (output_name in output_files) {
				callback({success:true,checksum:output_files[output_name].checksum||'',file_type:output_files[output_name].file_type||''});
			}
			else {
				callback({success:false,error:'output not found: '+output_name});
			}
		});
	}
	
	function get_path_from_checksum_and_file_type(checksum,file_type) {
		return m_node_path+'/_WISDM/data_files/'+checksum+'.'+file_type;
	}
	
	function handle_server_request(request,callback) {
		if (!is_valid_node_path(m_node_path)) {
			callback({success:false,error:'invalid node path: '+m_node_path});
			return;
		}
		
		var command=request.command||'';
		
		console.log ('SERVER REQUEST: '+command);
		
		if (command=='getFileChecksum') {
			get_file_for_request(request,function(tmp) {
				if (!tmp.success) {callback(tmp); return;}
				callback({success:true,checksum:tmp.checksum});
			});
		}
		else if (command=='getFileText') {
			get_file_for_request(request,function(tmp) {
				if (!tmp.success) {callback({success:false,error:err}); return;}
				var path=get_path_from_checksum_and_file_type(tmp.checksum,tmp.file_type);
				common.read_text_file(path,callback);
			});
		}
		else if (command=='setFileText') {
			callback({success:false,error:'setFileText not yet implemented'});
		}
		else if (command=='setFileData') {
			callback({success:false,error:'setFileData not yet implemented'});
		}
		else if (command=='getFileNames') {
			callback({success:false,error:'getFileNames not yet implemented'});
			//get_file_names(request,callback);
		}
		else if (command=='getFolderNames') {
			callback({success:false,error:'getFolderNames not yet implemented'});
			//get_folder_names(request,callback);
		}
		else if (command=='removeFile') {
			callback({success:false,error:'removeFile not yet implemented'});
			//remove_file(request,callback);
		}
		else if (command=='submitScript') {
			submit_script(m_node_path,request,function(tmp01) {
				if (!tmp01.success) {callback(tmp01); return;}
				if (!m_process_database) {
					callback({success:false,error:'Unexpected: process database is null.'});
					return;
				}
				m_process_database.setScriptOutput(tmp01,function(tmp2) {
					if (!tmp2.success) {callback({success:false,error:'Problem setting script output: '+tmp2.error}); return;}
					callback(tmp01);
				});
			});
		}
		else if (command=='getProcessingSummary') {
			get_processing_summary(request,callback);
		}
		else if (command=='find') {
			do_find(request,callback);
		}
		else if (command=='removeNonfinishedProcesses') {
			remove_nonfinished_processes(request,callback);
		}
		else if (command=='getFileBytes') {
			get_file_for_request(request,function(tmp) {
				if (!tmp.success) {callback(tmp); return;}
				var path=get_path_from_checksum_and_file_type(tmp.checksum,tmp.file_type);
				read_file_bytes(path,request.bytes,function(tmp1) {
					if (!tmp1.success) {callback(tmp1); return;}
					callback({success:true,data_base64:tmp1.data.toString('base64')});
				});
			});
		}
		else if (command=='updateProcessingNodeSource') {
			var spawn=require('child_process').spawn;
			var git_process=spawn('/usr/bin/git',['pull'],{cwd:common.get_file_path(__dirname),stdio:'inherit'});
			git_process.on('close',function() {
				that.closeWhenReady();
			});
			callback({success:true});
		}
		else {
			callback({success:false,error:'Unrecognized or missing server request command: '+command});
		}
	}
	
	
	/**************************************************************************************
	IMPLEMENTATION
	**************************************************************************************/
	
	function remove_nonfinished_processes(request,callback) {
		if (!m_process_database) {
			callback({success:false,error:'Process database is null.'});
			return;
		}
		
		var script_id=request.script_id||'';
		if (!script_id) {
			callback({success:false,error:'script_id is empty'});
			return;
		}
		
		m_process_database.remove('processes',{status:{$in:['pending','queued','running','error']},script_id:script_id},function(tmp) {
			callback(tmp);
		});
	}
	
	function do_find(request,callback) {
		if (!m_process_database) {
			callback({success:false,error:'Process database is null.'});
			return;
		}
			
		var collection=request.collection||'';
		var valid_collections=['processes','scripts'];
		if (valid_collections.indexOf(collection)<0) {
			callback({success:false,error:'Invalid or missing collection'});
			return;
		}
		
		m_process_database.find(collection,request.query||{},request.fields||{_id:1},function(tmp) {
			callback(tmp);
		});
	}
	
	function get_processing_summary(request,callback) {
		if (!m_process_database) {
			callback({success:false,error:'Process database is null.'});
			return;
		}
		
		var mode=request.mode||'';
		if (mode=='mode1') {
			get_processing_summary_mode1(request,callback);
		}
		else {
			callback({success:false,error:'Unrecognized mode: '+mode});
		}
	}
	function get_processing_summary_mode1(request,callback) {
		
		var ret={};
		
		get_process_counts_by_script(function(tmp1) {
			if (!tmp1.success) {callback(tmp1); return;}
			get_scripts_info(function(tmp2) {
				if (!tmp2.success) {callback(tmp2); return;}
				ret.success=true;
				callback(ret);
			});
		});
		
		function get_process_counts_by_script(cb) {
			m_process_database.getProcessRecords({},{script_id:1,status:1},function(tmp00) {
				var all_records=tmp00.records;
				
				var total_process_counts={pending:0,queued:0,running:0,finished:0,error:0};
				var process_counts_by_script={};
				tmp00.records.forEach(function(record) {
					var script_id=record.script_id||'';
					var status=record.status||'';
					if ((script_id)&&(status)) {
						if (!(script_id in process_counts_by_script)) {
							process_counts_by_script[script_id]={pending:0,queued:0,running:0,finished:0,error:0};
						}
						if (status in process_counts_by_script[script_id]) process_counts_by_script[script_id][status]++;
						if (status in total_process_counts) total_process_counts[status]++;
					}
				});
				
				for (var script_id in process_counts_by_script) {
					var tmp=process_counts_by_script[script_id];
					if ((!tmp.pending)&&(!tmp.queued)&&(!tmp.running)&&(!tmp.error))
						delete(process_counts_by_script[script_id]);
				}
				
				ret.process_counts_by_script=process_counts_by_script;
				ret.total_process_counts=total_process_counts;
				cb({success:true});
			});
		}
		
		function get_scripts_info(cb) {
			var script_ids=[];
			var scripts_info={};
			for (var script_id in ret.process_counts_by_script) script_ids.push(script_id);
			common.for_each_async(script_ids,function(script_id,cb2) {
				m_process_database.find('scripts',{script_id:script_id},{timestamps:1,num_processes:1},function(tmp) {
					if (!tmp) {cb2(tmp); return;}
					if (tmp.docs[0]) scripts_info[script_id]=tmp.docs[0];
					cb2({success:true});
				});
			},finalize_get_scripts_info,5);
			
			function finalize_get_scripts_info(tmp1) {
				if (!tmp1.success) {cb(tmp1); return;}
				ret.scripts_info=scripts_info;
				cb({success:true});
			}
		}
		
	}
	
	
	
	function read_file_bytes(path,bytes,callback) {
		var spawn=require('child_process').spawn;
		
		var args=[__dirname+'/read_file_bytes.js',path,bytes];
		spawned_process=spawn('node',args);
		
		var buffers=[];
			
		spawned_process.stdout.on('data',function(data) {
			buffers.push(data);
		});
		
		spawned_process.on('close', function (code) {
			var data_size=0;
			buffers.forEach(function(buffer) {data_size+=buffer.length;});
			
			if (data_size) {
				var data=new Buffer(data_size);
				var pos=0;
				buffers.forEach(function(buffer) {
					buffer.copy(data,pos,0,buffer.length);
					pos+=buffer.length;
				});
				callback({success:true,data:data});
			}
			else {
				callback({success:false,error:'No bytes read'});
			}
		});
	}
	
	/*
	function get_file_path(path) {
		var ind=path.lastIndexOf('/');
		if (ind<0) return '';
		return path.slice(0,ind);
	}
	*/

	/*
	function get_file_names(params,callback) {
		var path=get_absolute_path(params.path||'');
		common.get_dir_list(path,function(tmp) {
			if (!tmp.success) {
				callback(tmp);
				return;
			}
			callback({success:true,files:tmp.files});
		});
	}
	*/
	
	/*
	function get_folder_names(params,callback) {
		var path=get_absolute_path(params.path||'');
		common.get_dir_list(path,function(tmp) {
			if (!tmp.success) {
				callback(tmp);
				return;
			}
			callback({success:true,folders:tmp.dirs});
		});
	}
	*/	
}

var wisdmconfig=require('./wisdmconfig').wisdmconfig;

setTimeout(function() {
	
	var prescribed_timeout=0;
	process.argv.forEach(function(arg0) {
		if (arg0.indexOf('timeout=')===0) {
			prescribed_timeout=Number(arg0.slice(('timeout=').length));
		}
	});
	var process_timer=new Date();
	console.log ('Prescribed timeout = '+prescribed_timeout);
	
	var CC=new ProcessingNodeClient();
	CC.onClose(function() {
		console.log ('Node client closed. exiting.');
		process.exit(0);
	});
	
	CC.setProcessingNodeId(wisdmconfig.processingnodeclient.node_id);
	CC.setNodePath(wisdmconfig.processingnodeclient.node_path);
	console.log ('Initializing process database...');
	CC.initializeProcessDatabase(function(tmp) {
		if (tmp.success) {
			console.log ('Process database initialized.');
			step2();
			
		}
		else {
			console.log ('Error initializing process database: '+tmp.error);
			process.exit(0);
			return;
		}
	});
	
	function step2() {
		CC.checkPaths(function(tmp) {
			if (!tmp.success) {
				console.error(tmp.error);
				process.exit(0);
			}
			step3();
		});
	}
	
	function step3() {
		if (process.argv.indexOf('--testconnection')>=0) {
			do_connect_to_server(function(tmp) {
				if (tmp.success) {
					console.log ('CONNECTION SUCCESSFUL');
				}
				else {
					console.error('Problem connecting to server: '+tmp.error);
					process.exit(0);
				}
				CC.disconnectFromServer();
				setTimeout(function() {
					if (tmp.success) process.exit(12);
					else process.exit(0);
				},1000);
				return;
			});
		}
		else {
			CC.setHandleProcesses(true);
			setTimeout(periodical_connect_to_server,100);
		}
	}
	
	function do_connect_to_server(callback) {
		console.log ('Connecting to server...');
		CC.connectToServer(wisdmconfig.processingnodeclient.server_host,wisdmconfig.processingnodeclient.server_port,function(tmp) {
			if (tmp.success) {
				console.log ('Connected to server ***.');
			}
			else {
				console.log ('Error connecting to server: '+tmp.error);
				callback({success:false,error:'Error connecting to server: '+tmp.error});
				return;
			}
			var timer=new Date();
			function check_connected() {
				if (CC.connectionAccepted()) {
					callback({success:true});
				}
				else {
					var elapsed=(new Date())-timer;
					if (elapsed>5000) {
						callback({success:false,error:'Timeout while waiting for connection to be accepted.'});
						return;
					}
					else {
						setTimeout(check_connected,500);
					}
				}
			}
			setTimeout(check_connected,500);
		});
	}
	function periodical_connect_to_server() {
		if (prescribed_timeout>0) {
			var elapsed=(new Date())-process_timer;
			if (elapsed>prescribed_timeout) {
				CC.closeWhenReady();
			}
		}
		if (!CC.isConnected()) {
			do_connect_to_server(function(tmp) {
				setTimeout(periodical_connect_to_server,5000);
			});
		}
		else {
			setTimeout(periodical_connect_to_server,5000);
		}
	}
	
},100);








