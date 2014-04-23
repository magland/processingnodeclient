var fs=require('fs');
var common=require('./common').common;

function create_wisdm_processor(params) {
	var processor_type=params.processor_type||'';
	
	if (processor_type=='bash') {
		return create_wisdm_processor_bash(params);
	}
	else if ((processor_type=='octave')||(processor_type=='matlab')) {
		return create_wisdm_processor_octave(params);
	}
	else {
		throw new Error('Unrecognized processor type: '+processor_type);
	}
}

function create_wisdm_processor_octave(params) {
	var input_parameters=params.input_parameters||{};
	var input_files=params.input_files||{};
	var output_files=params.output_files||{};
	var the_requires=params.requires||[];
	var matlab_mode=(params.processor_type=='matlab');
	
	var main_sh='';
	if (matlab_mode) {
		main_sh+="matlab -nojvm -nosplash -r \"addpath('$1'); custom_script('$1'); exit;\" >stdout.txt 2>stderr.txt\n";
	}
	else {
		main_sh+="/usr/bin/octave -q --eval \"addpath('$1'); custom_script('$1'); exit;\" >stdout.txt 2>stderr.txt\n"; 
	}
	main_sh+="rc=$?\n";
	main_sh+="if [[ $rc != 0 ]] ; then\n";
	main_sh+="  echo \"error: process crashed.\" > status.txt\n";
	main_sh+="  cat stderr.txt >> status.txt\n";
	main_sh+="  exit $rc\n";
	main_sh+="fi\n";
	main_sh+="cat stderr.txt\n";
	main_sh+="cat stdout.txt\n";
	
	var custom_script_m='';
	
	custom_script_m+="function custom_script(WISDM_PROCESSOR_PATH)\n\n";
	
	custom_script_m+="try\n\n";
	
	for (var input_parameter_name in input_parameters) {
		var input_parameter=input_parameters[input_parameter_name];
		var file_name_str="'input_parameters/"+input_parameter_name+".txt'";
		custom_script_m+=input_parameter_name+"=read_text_file("+file_name_str+");\n";
		if (input_parameter.parameter_type=='int') {
			custom_script_m+=input_parameter_name+"=floor(str2double("+input_parameter_name+"));";
		}
		else if (input_parameter.parameter_type=='real') {
			custom_script_m+=input_parameter_name+"=str2double("+input_parameter_name+");";
		}
		else {
		}
	}
	for (var input_file_name in input_files) {
		var input_file=input_files[input_file_name];
		
		if (input_file.file_type.indexOf('LIST<')===0) {
			var ind1=input_file.file_type.indexOf('<');
			var ind2=input_file.file_type.indexOf('>');
			if ((ind1<0)||(ind2<0)||(ind2<ind1)) {
				console.error('Improper input type: '+input_file.file_type);
			}
			else {
				var type0=input_file.file_type.slice(ind1+1,ind2);
				var length_path_str="'input_files/"+input_file_name+"/length'";
				var file_path_str="sprintf('input_files/%s/%d.%s','"+input_file_name+"',j_-1,'"+type0+"')";
				custom_script_m+="disp('reading length');\n";
				custom_script_m+="len_=floor(str2double(read_text_file("+length_path_str+")));\n";
				custom_script_m+="disp(len_);\n";
				custom_script_m+="for j_=1:len_ disp(j_); disp("+file_path_str+"); "+input_file_name+"{j_}="+create_read_file_expression(file_path_str,type0)+"; end;\n";
			}
		}
		else {
			var file_path_str="'input_files/"+input_file_name+"."+(input_file.file_type)+"'";
			custom_script_m+=input_file_name+"="+create_read_file_expression(file_path_str,input_file.file_type);
		}
	}
	for (var output_file_name in output_files) {
		var output_file=output_files[output_file_name];
		
		var file_name_str="'output_files/"+output_file_name+"."+(output_file.file_type)+"'";
		
		if (output_file.file_type=='mda') {
			//
		}
		else if (output_file.file_type=='nii') {
			//
		}
		else {
			custom_script_m+=output_file_name+"="+file_name_str+";\n";
		}
	}
	
	custom_script_m+="\n\n%%%%%%%%%%%%%%%%%%%%%%%%%%%%\n";
	custom_script_m+=params.code;
	custom_script_m+="\n%%%%%%%%%%%%%%%%%%%%%%%%%%%%\n\n";
	
	for (var output_file_name in output_files) {
		var output_file=output_files[output_file_name];
		
		var file_name_str="'output_files/"+output_file_name+"."+(output_file.file_type)+"'";
		
		if (output_file.file_type=='mda') {
			custom_script_m+="writeArray("+file_name_str+","+output_file_name+");\n";
		}
		else if (output_file.file_type=='nii') {
			custom_script_m+="writeNii("+file_name_str+","+output_file_name+");\n";
		}
		else {
			
		}
	}
	
	custom_script_m+="write_text_file('status.txt','finished');";
	
	
	if (matlab_mode) {
		custom_script_m+="catch err\n";
		custom_script_m+="\tdisp(err);\n";
		custom_script_m+="end\n\n";
	}
	else {
		custom_script_m+="catch\n";
		custom_script_m+="\tmsg=lasterror.message;\n";
		custom_script_m+="\tif (length(lasterror.stack)>0) msg=strcat(msg,' (',lasterror.stack(1).name,')'); end;\n";
		custom_script_m+="\tdisp(lasterror.message);\n";
		custom_script_m+="\tdisp(lasterror.stack);\n";
		custom_script_m+="\twrite_text_file('status.txt',strcat('error: ',msg));\n";
		custom_script_m+="end\n\n";
	}
	
	custom_script_m+="end\n\n";
	
	custom_script_m+="function text=read_text_file(fname)\n";
	custom_script_m+="fid000=fopen(fname, 'r');\n";
	custom_script_m+="text=(fread(fid000,'*char'))';\n";
	custom_script_m+="fclose(fid000);\n";
	custom_script_m+="end\n\n";
	
	custom_script_m+="function write_text_file(fname,txt)\n";
	custom_script_m+="fid000=fopen(fname, 'w');\n";
	custom_script_m+="fprintf(fid000,txt);\n";
	custom_script_m+="fclose(fid000);\n";
	custom_script_m+="end\n\n";
	
	var processor_files=[];
	processor_files.push({path:'main.sh',content:main_sh});
	processor_files.push({path:'custom_script.m',content:custom_script_m});
	var path0=__dirname+'/octave'; 
	var files=fs.readdirSync(path0);
	files.forEach(function(file) {
		var txt0=fs.readFileSync(path0+'/'+file,'utf8');
		processor_files.push({path:file,content:txt0});
	});
	the_requires.forEach(function(the_require) {
		processor_files.push({path:the_require.path,content:the_require.content});
	});
	
	var tmp000=common.extend(true,{},params); //the id will depend on the params
	delete(tmp000.processor_name); //but don't let the id depend on the name!
	delete(tmp000.processor_id); //and don't let it depend on the empty processor id field
	
	var processor={
		processor_id:params.processor_id||compute_sha1(JSON.stringify(tmp000)),
		processor_type:params.processor_type,
		processor_name:params.processor_name,
		files:processor_files,
		input_parameters:input_parameters,
		input_files:input_files,
		output_files:output_files
	};
	return processor;

	function create_read_file_expression(file_path_str,file_type) {
		if (file_type=='mda') {
			return "readArray("+file_path_str+")";
		}
		else if (file_type=='nii') {
			return "readNii("+file_path_str+")";
		}
		else {
			return file_path_str;
		}
	}
}


function create_wisdm_processor_bash(params) {
	var input_parameters=params.input_parameters||{};
	var input_files=params.input_files||{};
	var output_files=params.output_files||{};
	
	var main_sh='';
	for (var input_parameter_name in input_parameters) {
		main_sh+=input_parameter_name+'=$(cat input_parameters/'+input_parameter_name+'.txt)\n';
	}
	for (var input_file_name in input_files) {
		var input_file=input_files[input_file_name];
		main_sh+=input_file_name+'="input_files/'+input_file_name+'.'+(input_file.file_type)+'"\n';
	}
	for (var output_file_name in output_files) {
		var output_file=output_files[output_file_name];
		main_sh+=output_file_name+'="output_files/'+output_file_name+'.'+(output_file.file_type)+'"\n';
	}
	
	main_sh+='\n\n##########################\n';
	main_sh+=params.code||'';
	main_sh+='\n##########################\n\n';
	
	main_sh+="echo \"finished\" > status.txt\n";
	
	var tmp000=common.extend(true,{},params); //the id will depend on the params
	delete(tmp000.processor_name); //but don't let the id depend on the name!
	
	var processor={
		processor_id:params.processor_id||compute_sha1(JSON.stringify(tmp000)),
		processor_type:params.processor_type,
		processor_name:params.processor_name,
		files:[
			{path:'main.sh',content:main_sh}
		],
		input_parameters:input_parameters,
		input_files:input_files,
		output_files:output_files
	};
	return processor;
}

function compute_sha1(str) {
	var crypto=require('crypto');
	var ret=crypto.createHash('sha1');
	ret.update(str);
	return ret.digest('hex');
}

exports.create_wisdm_processor=create_wisdm_processor;
