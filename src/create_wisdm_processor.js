var fs=require('fs');
var common=require('./common').common;

function create_wisdm_processor(params) {
	var processor_type=params.processor_type||'';
	
	if (processor_type=='bash') {
		return create_wisdm_processor_bash(params);
	}
	else if (processor_type=='node') {
		return create_wisdm_processor_node(params);
	}
	else if ((processor_type=='octave')||(processor_type=='matlab')) {
		return create_wisdm_processor_octave(params);
	}
	else if (processor_type=='cpp') {
		return create_wisdm_processor_cpp(params);
	}
	else if (processor_type=='python') {
		return create_wisdm_processor_python(params);
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
			custom_script_m+=input_parameter_name+"=floor(str2double("+input_parameter_name+"));\n";
		}
		else if (input_parameter.parameter_type=='real') {
			custom_script_m+=input_parameter_name+"=str2double("+input_parameter_name+");\n";
		}
		else if (input_parameter.parameter_type=='LIST<int>') {
			custom_script_m+=input_parameter_name+"=strread("+input_parameter_name+",'%d','delimiter',',');\n";
		}
		else if (input_parameter.parameter_type=='LIST<real>') {
			custom_script_m+=input_parameter_name+"=strread("+input_parameter_name+",'%f','delimiter',',');\n";
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
			custom_script_m+=input_file_name+"="+create_read_file_expression(file_path_str,input_file.file_type)+";\n";
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
		custom_script_m+="\tdisp(err.message);\n";
		custom_script_m+="\tdisp(err.stack);\n";
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
	custom_script_m+="fprintf(fid000,'%s',txt);\n";
	custom_script_m+="fclose(fid000);\n";
	custom_script_m+="end\n\n";
	
	var processor_files=[];
	processor_files.push({path:'main.sh',content:main_sh});
	processor_files.push({path:'custom_script.m',content:custom_script_m});
	var path0=__dirname+'/octave'; 
	console.log('__dirname for octave='+__dirname);
	var files=fs.readdirSync(path0);
	console.log(files);
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

function create_wisdm_processor_python(params) {
	var input_parameters=params.input_parameters||{};
	var input_files=params.input_files||{};
	var output_files=params.output_files||{};
	var the_requires=params.requires||[];
	
	var main_sh='';
	main_sh+="python $1/custom_script.py $1 >stdout.txt 2>stderr.txt\n";
	
	main_sh+="rc=$?\n";
	main_sh+="if [[ $rc != 0 ]] ; then\n";
	main_sh+="  echo \"error: process crashed.\" > status.txt\n";
	main_sh+="  cat stderr.txt >> status.txt\n";
	main_sh+="  exit $rc\n";
	main_sh+="fi\n";
	main_sh+="cat stderr.txt\n";
	main_sh+="cat stdout.txt\n";
	
	var custom_script_py='';
	custom_script_py+='import sys\n';
	custom_script_py+='sys.path.append(sys.argv[1])\n';
	
	custom_script_py+='\n';
	custom_script_py+='##################################################\n';
	custom_script_py+='#important so we do not attempt to display a window\n';
	custom_script_py+='#see http://www.astrobetter.com/plotting-to-a-file-in-python/\n';
	custom_script_py+='import matplotlib\n';
	custom_script_py+='matplotlib.use(\'Agg\')\n';
	custom_script_py+='from pylab import *\n';
	custom_script_py+='##################################################\n';
	custom_script_py+='\n';
	
	custom_script_py+='import jfm_utils as utils\n';
	
	for (var input_parameter_name in input_parameters) {
		var input_parameter=input_parameters[input_parameter_name];
		var file_name_str="'input_parameters/"+input_parameter_name+".txt'";
		custom_script_py+=input_parameter_name+"=utils.read_text_file("+file_name_str+");\n";
		if (input_parameter.parameter_type=='int') {
			custom_script_py+=input_parameter_name+"=int("+input_parameter_name+");\n";
		}
		else if (input_parameter.parameter_type=='real') {
			custom_script_py+=input_parameter_name+"=float("+input_parameter_name+");\n";
		}
		else if (input_parameter.parameter_type=='LIST<int>') {
			custom_script_py+=input_parameter_name+"=utils.string_to_intlist("+input_parameter_name+");\n";
		}
		else if (input_parameter.parameter_type=='LIST<real>') {
			custom_script_py+=input_parameter_name+"=utils.string_to_floatlist("+input_parameter_name+");\n";
		}
		else {
		}
	}
	for (var input_file_name in input_files) {
		var input_file=input_files[input_file_name];
		
		if (input_file.file_type.indexOf('LIST<')===0) {
			/*var ind1=input_file.file_type.indexOf('<');
			var ind2=input_file.file_type.indexOf('>');
			if ((ind1<0)||(ind2<0)||(ind2<ind1)) {
				console.error('Improper input type: '+input_file.file_type);
			}
			else {
				var type0=input_file.file_type.slice(ind1+1,ind2);
				var length_path_str="'input_files/"+input_file_name+"/length'";
				var file_path_str="sprintf('input_files/%s/%d.%s','"+input_file_name+"',j_-1,'"+type0+"')";
				custom_script_py+="disp('reading length');\n";
				custom_script_py+="len_=floor(str2double(read_text_file("+length_path_str+")));\n";
				custom_script_py+="disp(len_);\n";
				custom_script_py+="for j_=1:len_ disp(j_); disp("+file_path_str+"); "+input_file_name+"{j_}="+create_read_file_expression(file_path_str,type0)+"; end;\n";
			}*/
		}
		else {
			var file_path_str="'input_files/"+input_file_name+"."+(input_file.file_type)+"'";
			custom_script_py+=input_file_name+"="+file_path_str+";\n";
		}
	}
	for (var output_file_name in output_files) {
		var output_file=output_files[output_file_name];
		
		var file_name_str="'output_files/"+output_file_name+"."+(output_file.file_type)+"'";
		
		custom_script_py+=output_file_name+"="+file_name_str+";\n";
	}
	
	var code0=unindent(params.code);
	
	custom_script_py+="\n\n############################\n";
	custom_script_py+=code0;
	custom_script_py+="\n############################\n\n";
	
	/*
	for (var output_file_name in output_files) {
		var output_file=output_files[output_file_name];
		
		var file_name_str="'output_files/"+output_file_name+"."+(output_file.file_type)+"'";
		
		if (output_file.file_type=='mda') {
			custom_script_py+="writeArray("+file_name_str+","+output_file_name+");\n";
		}
		else if (output_file.file_type=='nii') {
			custom_script_py+="writeNii("+file_name_str+","+output_file_name+");\n";
		}
		else {
			
		}
	}
	*/
	
	custom_script_py+="utils.write_text_file('status.txt','finished');";
	
	var processor_files=[];
	processor_files.push({path:'main.sh',content:main_sh});
	processor_files.push({path:'custom_script.py',content:custom_script_py});
	console.log('__dirname='+__dirname);
	var path0=__dirname+'/python'; 
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
}

function unindent(code) {
	var lines=code.split('\n');
	for (var i=0; i<lines.length; i++) {
		lines[i]=unindent_line(lines[i]);
	}
	return lines.join('\n');
	
	function unindent_line(line) {
		if (line[0]=='\t') {
			line=line.slice(1);
		}
		return line;
	}
}

function create_wisdm_processor_cpp(params) {
	var input_parameters=params.input_parameters||{};
	var input_files=params.input_files||{};
	var output_files=params.output_files||{};
	var the_requires=params.requires||[];
	var using_nii=false;
	
	var main_sh='';
	main_sh+="working_path=$PWD\n";
	main_sh+="cd $1\n";
	main_sh+="rm -f bin/custom_cpp\n";
	main_sh+="qmake\n";
	main_sh+="make\n";
	main_sh+="cd $working_path\n";
	main_sh+="$1/bin/custom_cpp >stdout.txt 2>stderr.txt\n";
	
	main_sh+="rc=$?\n";
	main_sh+="if [[ $rc != 0 ]] ; then\n";
	main_sh+="  echo \"error: process crashed.\" > status.txt\n";
	main_sh+="  cat stderr.txt >> status.txt\n";
	main_sh+="  exit $rc\n";
	main_sh+="fi\n";
	main_sh+="cat stderr.txt\n";
	main_sh+="cat stdout.txt\n";
	
	var processor_files=[];
	var path0=__dirname+'/cpp'; 
	var files=fs.readdirSync(path0);
	files.forEach(function(file) {
		var txt0=fs.readFileSync(path0+'/'+file,'utf8');
		processor_files.push({path:file,content:txt0});
	});
	the_requires.forEach(function(the_require) {
		processor_files.push({path:the_require.path,content:the_require.content});
	});
	
	var initialization_code='';
	var finalization_code='';
	for (var input_parameter_name in input_parameters) {
		var input_parameter=input_parameters[input_parameter_name];
		var file_name_str="\"input_parameters/"+input_parameter_name+".txt\"";
		if (input_parameter.parameter_type=='int') {
			initialization_code+="int "+input_parameter_name+"=read_text_file("+file_name_str+").toInt();\n";
		}
		else if (input_parameter.parameter_type=='real') {
			initialization_code+="double "+input_parameter_name+"=read_text_file("+file_name_str+").toDouble();\n";
		}
		else if (input_parameter.parameter_type=='string') {
			initialization_code+="QString "+input_parameter_name+"=read_text_file("+file_name_str+");\n";
		}
		else if (input_parameter.parameter_type=='LIST<int>') {
			initialization_code+="QList<int> "+input_parameter_name+"=to_int_list(read_text_file("+file_name_str+"));\n";
		}
		else if (input_parameter.parameter_type=='LIST<real>') {
			initialization_code+="QList<double> "+input_parameter_name+"=to_double_list(read_text_file("+file_name_str+"));\n";
		}
		else {
		}
	}
	for (var input_file_name in input_files) {
		var input_file=input_files[input_file_name];
		
		/*
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
		*/
		var file_path_str="\"input_files/"+input_file_name+"."+(input_file.file_type)+"\"";
		if (input_file.file_type=='mda') {
			initialization_code+="mda "+input_file_name+"; "+input_file_name+".load("+file_path_str+");\n";
		}
		else if (input_file.file_type=='nii') {
			using_nii=true;
			initialization_code+="nii "+input_file_name+"; "+input_file_name+".load("+file_path_str+");\n";
		}
		else {
			initialization_code+="QString "+input_file_name+"="+file_path_str+";\n";
		}
		/*}*/
	}
	for (var output_file_name in output_files) {
		var output_file=output_files[output_file_name];
		
		var file_name_str="\"output_files/"+output_file_name+"."+(output_file.file_type)+"\"";
		
		if (output_file.file_type=='mda') {
			initialization_code+="mda "+output_file_name+";";
		}
		else if (output_file.file_type=='nii') {
			using_nii=true;
			initialization_code+="nii "+output_file_name+";";
		}
		else {
			initialization_code+="QString "+output_file_name+"="+file_name_str+";\n";
		}
	}
	
	for (var output_file_name in output_files) {
		var output_file=output_files[output_file_name];
		
		var file_name_str="\"output_files/"+output_file_name+"."+(output_file.file_type)+"\"";
		
		if (output_file.file_type=='mda') {
			finalization_code+=output_file_name+".save("+file_name_str+");\n";
		}
		else if (output_file.file_type=='nii') {
			using_nii=true;
			finalization_code+=output_file_name+".save("+file_name_str+");\n";
		}
		else {
			
		}
	}
	
	var includes_code='';
	if (using_nii) includes_code+='#include "nii.h"\n';
	
	var headers='';
	var sources='';
	var pro_includes='';
	the_requires.forEach(function(the_require) {
		var suf=common.get_file_suffix(the_require.path);
		if ((suf=='h')||(suf=='hpp')) {
			includes_code+='#include "'+the_require.path+'"\n';
			headers+=the_require.path+' ';
		}
		else if ((suf=='c')||(suf=='cpp')||(suf=='cxx')) {
			sources+=the_require.path+' ';
		}
		else if (suf=='pri') {
			pro_includes+='include('+the_require.path+')\n';
		}
	});
	
	function preprocess_template_file(file,txt) {
		if (file=='custom_cpp.pro') {
			txt=replace_all(txt,'$destdir$','bin');
			txt=replace_all(txt,'$target$','custom_cpp');
			txt=replace_all(txt,'$headers$',headers);
			txt=replace_all(txt,'$sources$',sources);
			txt=replace_all(txt,'$commondir$','/home/magland/wisdm/processingnodeclient/src/cpp_common'); //need to fix this path!
			var using_nii_code='';
			if (using_nii) using_nii_code='USING_NII=true';
			txt=replace_all(txt,'$using_nii$',using_nii_code);
			txt+='\n'+pro_includes;
		}
		else if (file=='custom_cpp.cpp') {
			txt=replace_all(txt,'$includes$',includes_code);
			txt=replace_all(txt,'$initialization$',initialization_code);
			txt=replace_all(txt,'$script$',params.code);
			txt=replace_all(txt,'$finalization$',finalization_code);
		}
		return txt;
	}
	function replace_all(str,str1,str2) {
		return str.split(str1).join(str2);
	}
	
	for (var i=0; i<processor_files.length; i++) {
		var content=preprocess_template_file(processor_files[i].path,processor_files[i].content);
		processor_files[i].content=content;
	}
		
	
	
	//custom_script_m+="write_text_file('status.txt','finished');";
	
	
	/*if (matlab_mode) {
		custom_script_m+="catch err\n";
		custom_script_m+="\tdisp(err.message);\n";
		custom_script_m+="\tdisp(err.stack);\n";
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
	}*/
	
	//custom_script_m+="end\n\n";
	
	/*custom_script_m+="function text=read_text_file(fname)\n";
	custom_script_m+="fid000=fopen(fname, 'r');\n";
	custom_script_m+="text=(fread(fid000,'*char'))';\n";
	custom_script_m+="fclose(fid000);\n";
	custom_script_m+="end\n\n";
	
	custom_script_m+="function write_text_file(fname,txt)\n";
	custom_script_m+="fid000=fopen(fname, 'w');\n";
	custom_script_m+="fprintf(fid000,'%s',txt);\n";
	custom_script_m+="fclose(fid000);\n";
	custom_script_m+="end\n\n";*/
	
	
	processor_files.push({path:'main.sh',content:main_sh});
	
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

	/*function create_read_file_expression(file_path_str,file_type) {
		if (file_type=='mda') {
			return "readArray("+file_path_str+")";
		}
		else if (file_type=='nii') {
			return "readNii("+file_path_str+")";
		}
		else {
			return file_path_str;
		}
	}*/
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

function create_wisdm_processor_node(params) {
	var input_parameters=params.input_parameters||{};
	var input_files=params.input_files||{};
	var output_files=params.output_files||{};
	var the_requires=params.requires||[];
	
	var main_js='var fs=require("fs");\n';
	for (var input_parameter_name in input_parameters) {
		main_js+="var "+input_parameter_name+"=fs.readFileSync('input_parameters/"+input_parameter_name+".txt','utf8');\n";
	}
	for (var input_file_name in input_files) {
		var input_file=input_files[input_file_name];
		main_js+="var "+input_file_name+"='input_files/"+input_file_name+"."+(input_file.file_type)+"';\n";
	}
	for (var output_file_name in output_files) {
		var output_file=output_files[output_file_name];
		main_js+="var "+output_file_name+"='output_files/"+output_file_name+"."+(output_file.file_type)+"';\n";
	}
	
	main_js+='\n\n///////////////////////////\n';
	main_js+=params.code||'';
	main_js+='\n///////////////////////////\n\n';
	
	the_requires.forEach(function(the_require) {
		main_js+='\n/* '+the_require.path+'*/\n\n'+the_require.content+'\n\n';
	});
	
	main_js+="fs.writeFileSync('status.txt','finished','utf8');\n";
	
	main_sh="node $1/main.js\n";
	
	var tmp000=common.extend(true,{},params); //the id will depend on the params
	delete(tmp000.processor_name); //but don't let the id depend on the name!
	
	var processor={
		processor_id:params.processor_id||compute_sha1(JSON.stringify(tmp000)),
		processor_type:params.processor_type,
		processor_name:params.processor_name,
		files:[
			{path:'main.js',content:main_js},
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
