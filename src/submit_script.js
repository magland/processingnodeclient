var fs=require('fs');
var common=require('./common').common;
var wisdmconfig=require('./wisdmconfig').wisdmconfig;

function submit_script(node_path,request,callback) {
	if ((!request.auth_info)||(!request.auth_info.user_id)) {
		callback({success:false,error:'user_id missing in request of submit_script'});
		return;
	}
	
	var script_id=common.make_random_id(10);
	
	var scripts=request.scripts||{};
	var code='';
	for (var key in scripts) {
		code+='// '+key+'\n';
		code+=scripts[key];
		code+='\n';
	}
	
	var write_script_timer=new Date();
	write_temporary_script(code,{user_id:request.auth_info.user_id},function(tmp1) {
		if (tmp1.success) {
			execute_script(tmp1.script_path,function(tmp2) {
				tmp2.elapsed_write_script=(new Date())-write_script_timer;
				callback(tmp2);
			});
		}
		else {
			callback({success:false,error:tmp1.error});
		}
	});
	
	
	function write_temporary_script(code,params,callback2) {
		var custom_code=code;
		
		common.create_path(node_path+'/_WISDM/scripts/'+script_id,node_path,function(tmp1) {
			if (!tmp1.success) {
				callback2(tmp1);
				return;
			}
			common.read_text_file(__dirname+'/process_script_internals.js',function(tmp0) {
				if (!tmp0.text) {
					callback2({success:false,error:'Unable to read process_script_internals.js'});
					return;
				}
				custom_code+=tmp0.text;
				var script_info={
					processing_node_id:wisdmconfig.processingnodeclient.node_id,
					script_id:script_id,
					run_parameters:request.run_parameters||{},
					user_id:params.user_id,
					submitted:(new Date()).toString()
				};
				custom_code+="\n\n\nexports.script_info="+JSON.stringify(script_info)+";\n";
				common.write_text_file(node_path+'/_WISDM/scripts/'+script_id+'/custom_script.js',custom_code,function(tmp06) {
					if (!tmp06.success) {
						callback2(tmp06);
						return;
					}
		
					var files_to_copy=[
						'process_script_main.js','create_wisdm_processor.js',
						'processdatabase.js','runningprocess.js','common.js','wisdmusage.js',
						'databasemanager.js'
					];
					var folders_to_copy=['octave','cpp'];
					copy_files(files_to_copy,__dirname,node_path+'/_WISDM/scripts/'+script_id,function(tmp05) {
						if (!tmp05.success) {
							callback2(tmp05);
							return;
						}
						copy_folders(folders_to_copy,__dirname,node_path+'/_WISDM/scripts/'+script_id,function(tmp06) {
							if (!tmp06.success) {
								callback2(tmp06);
								return;
							}
							finalize_write_temporary_script();
						});
					});
					/*
					common.for_each_async(scripts,function(script,cb) {
						common.read_text_file(__dirname+'/'+script,function(tmp) {
							if (!tmp.text) {
								cb({success:false,error:'Unable to read '+script});
								return;
							}
							var fname=node_path+'/_WISDM/scripts/'+script_id+'/'+script;
							common.write_text_file(fname,tmp.text,function(tmp2) {
								if (!tmp2.success) {
									cb(tmp2);
									return;
								}
								cb({success:true});
							});
						});
					},finalize_write_temporary_script,5);
					*/
				});
			});
		});
				
		function finalize_write_temporary_script() {
			/*if (!tmp05.success) {
				callback2(tmp05);
				return;
			}*/
			var main_fname=node_path+'/_WISDM/scripts/'+script_id+'/process_script_main.js';
			callback2({success:true,script_path:main_fname});
		}
	}
	
	function copy_files(files,srcdir,dstdir,callback) {
		common.for_each_async(files,function(file,cb) {
			common.read_text_file(srcdir+'/'+file,function(tmp) {
				if (!tmp.text) {
					cb({success:false,error:'Unable to read '+file});
					return;
				}
				var fname=dstdir+'/'+file;
				common.write_text_file(fname,tmp.text,function(tmp2) {
					if (!tmp2.success) {
						cb(tmp2);
						return;
					}
					cb({success:true});
				});
			});
		},function(tmp1) {
			callback(tmp1);
		},5);
	}
	function copy_folders(folders,srcdir,dstdir,callback) {
		common.for_each_async(folders,function(folder,cb) {
			common.mkdir(dstdir+'/'+folder,function(tmpA) {
				if (!tmpA.success) {cb(tmpA); return;}
				fs.readdir(srcdir+'/'+folder,function(err,files) {
					if (err) {
						cb({success:false,error:err});
						return;
					}
					copy_files(files,srcdir+'/'+folder,dstdir+'/'+folder,function(tmpB) {
						if (!tmpB.success) {cb(tmpB); return;}
						cb({success:true});
					});
				});
			});
		},function(tmpC) {
			callback(tmpC);
		},5);
	}
	
	function execute_script(fname,callback3) {
		var timer=new Date();
		
		var spawn = require('child_process').spawn;
		var process=spawn('node',[fname]);
		var output='';
		process.stdout.on('data',function(data) {
			output+=data;
		});

		process.stderr.on('data', function (data) {
			output+=data;
		});
		
		process.on('close', function (code) {
			
			var elapsed=(new Date())-timer;
					
			output+='Process exited with code ' + code;
			common.read_text_file(common.get_file_path(fname)+'/wisdm_submitted_processes.json',function(tmp1) {
				if (!tmp1.success) {
					callback3({success:false,error:'Unexpected problem: Unable to read wisdm_submitted_processes.json',output:output});
					return;
				}
				var submitted_processes;
				try {
					submitted_processes=JSON.parse(tmp1.text);
				}
				catch(err) {
					callback3({success:false,error:'Unexpected problem parsing submitted processes'});
					return;
				}
				
				callback3({success:true,output:output,submitted_processes:submitted_processes,script_id:script_id,elapsed:elapsed});
			});
		});
	}
	
	
}

exports.submit_script=submit_script;
