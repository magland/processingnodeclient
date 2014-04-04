var fs=require('fs');
var crypto=require('crypto');

var common={};

common.make_random_id=function(numchars) {
	if (!numchars) numchars=10;
	var text = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for( var i=0; i < numchars; i++ ) text += possible.charAt(Math.floor(Math.random() * possible.length));
	return text;
};

common.check_directory_exists=function(path,callback) {
	fs.stat(path,function(err,stat) {
		if (err) callback(false);
		else {
			if (stat.isDirectory) callback(true);
			else callback(false);
		}
	});
};

common.mkdir=function(path,callback) {
	common.check_directory_exists(path,function(exists) {
		if (exists) {
			callback({success:true});
		}
		else {
			fs.mkdir(path,function(err) {
				if (!err) callback({success:true});
				else callback({success:false,error:'Unable to mkdir '+path});
			});
		}
	});
};
common.create_path=function(path,base_path,callback) {
	if (path===base_path) {
		common.check_directory_exists(path,function(exists) {
			if (exists) callback({success:true});
			else callback({success:false,error:'base_path directory does not exist'});
		});
		return;
	}
	if (path.indexOf(base_path+'/')!==0) {
		callback({success:false,error:'Unexpected problem creating path (68): '+path});
		return;
	}
	var path2=path.slice((base_path+'/').length);
	var ind=path2.indexOf('/');
	if (ind>0) {
		var path2a=path2.slice(0,ind);
		var path2b=path2.slice(ind+1);
		common.mkdir(base_path+'/'+path2a,function(tmp3) {
			if (tmp3.success) {
				common.create_path(path,base_path+'/'+path2a,callback);
			}
			else callback(tmp3);
		});
	}
	else {
		common.mkdir(base_path+'/'+path2,callback);
	}
};

common.read_text_file=function(path,callback) {
	var ret='';
	var s=fs.createReadStream(path,{encoding:'utf8'});
	s.on('data',function(d) {ret+=d;});
	s.on('end',function() {callback({success:true,text:ret});});
	s.on('error',function(err) {callback({success:false,error:JSON.stringify(err)});});
};
common.write_text_file=function(path,text,callback) {
	fs.writeFile(path,text,function(err) {
		if (err) {
			if (callback) callback({success:false,error:JSON.stringify(err)});
		}
		else {
			if (callback) callback({success:true});
		}
	});
};

common.get_file_checksum=function(path,callback) {
	compute_sha1_sum_of_file(path,function(tmp) {
		if (tmp.success) {
			callback({success:true,checksum:tmp.sha1});
		}
		else {
			callback({success:false,error:tmp.error});
		}
	});
	
	function compute_sha1_sum_of_file(path,callback) {
		var ret=crypto.createHash('sha1');
		var s=fs.createReadStream(path);
		s.on('data',function(d) {ret.update(d);});
		s.on('end',function() {callback({success:true,sha1:ret.digest('hex')});});
		s.on('error',function(err) {callback({success:false,error:JSON.stringify(err)});});
	}
};

common.get_dir_list=function(path,callback) {
	var ret_files=[];
	var ret_dirs=[];
	fs.readdir(path,function(err,files) {
		if (err) {
			callback({success:false,error:err});
			return;
		}
	
		common.for_each_async(files,function(file,cb) {
			fs.lstat(path+'/'+file, function(err2,stats) {
				if (err2) {
					cb({success:false,error:err2});
					return;
				}
				
				if (stats.isDirectory()) ret_dirs.push(file);
				else ret_files.push(file);
				cb({success:true});
			});
		},finalize_get_dir_list,5);
	});
	
	function finalize_get_dir_list(tmp) {
		if (!tmp.success) {
			callback(tmp);
			return;
		}
		
		callback({success:true,files:ret_files,dirs:ret_dirs});
	}
};


//Thanks: https://github.com/jquery/jquery/blob/master/src/core.js
common.extend=function() {
	var options, name, src, copy, copyIsArray, clone, target = arguments[0] || {},
	i = 1,
	length = arguments.length,
	deep = false,
	toString = Object.prototype.toString,
	hasOwn = Object.prototype.hasOwnProperty,
	push = Array.prototype.push,
	slice = Array.prototype.slice,
	trim = String.prototype.trim,
	indexOf = Array.prototype.indexOf,
	class2type = {
		"[object Boolean]": "boolean",
		"[object Number]": "number",
		"[object String]": "string",
		"[object Function]": "function",
		"[object Array]": "array",
		"[object Date]": "date",
		"[object RegExp]": "regexp",
		"[object Object]": "object"
	},
	jQuery = {
		isFunction: function (obj) {
			return jQuery.type(obj) === "function";
		},
		isArray: Array.isArray ||
		function (obj) {
			return jQuery.type(obj) === "array";
		},
		isWindow: function (obj) {
			return obj !== null && obj == obj.window;
		},
		isNumeric: function (obj) {
			return !isNaN(parseFloat(obj)) && isFinite(obj);
		},
		type: function (obj) {
			return obj === null ? String(obj) : class2type[toString.call(obj)] || "object";
		},
		isPlainObject: function (obj) {
			if (!obj || jQuery.type(obj) !== "object" || obj.nodeType) {
				return false;
			}
			try {
				if (obj.constructor && !hasOwn.call(obj, "constructor") && !hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
					return false;
				}
			} catch (e) {
				return false;
			}
			var key;
			for (key in obj) {}
			return key === undefined || hasOwn.call(obj, key);
		}
	};
	if (typeof target === "boolean") {
		deep = target;
		target = arguments[1] || {};
		i = 2;
	}
	if (typeof target !== "object" && !jQuery.isFunction(target)) {
		target = {};
	}
	if (length === i) {
		target = this;
		--i;
	}
	for (i; i < length; i++) {
		if ((options = arguments[i]) !== null) {
			for (name in options) {
				src = target[name];
				copy = options[name];
				if (target === copy) {
					continue;
				}
				if (deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)))) {
					if (copyIsArray) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];
					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}
					// WARNING: RECURSION
					target[name] = common.extend(deep, clone, copy);
				} else if (copy !== undefined) {
					target[name] = copy;
				}
			}
		}
	}
	return target;
};

common.for_each_async=function(list,func,callback,max_simultaneous) {
	var ind=0;
	var num_running=0;
	var did_callback=false;
	do_next();
	function do_next() {
		if (ind==list.length) {
			if (!did_callback) {
				did_callback=true;
				callback({success:true});
				return;
			}
		}
		if (num_running>=max_simultaneous) return;
		ind++;
		num_running++;
		func(list[ind-1],function(tmp) {
			num_running--;
			if (tmp.success) do_next();
			else {
				if (!did_callback) {
					callback(tmp); did_callback=true;
				}
			}
		});
	}
};
common.get_file_suffix=function(str) {
	if (!str) return '';
	var ind=str.lastIndexOf('.');
	if (ind>=0) return str.substr(ind+1);
	else return '';
};
common.get_file_name=function(str) {
	if (!str) return '';
	var ind=str.lastIndexOf('/');
	if (ind>=0) return str.substr(ind+1);
	else return str;
};
common.get_file_name_without_suffix=function(str) {
	if (!str) return '';
	var ret=str;
	var ind=ret.lastIndexOf('/');
	if (ind>=0) ret=ret.substr(ind+1);
	var ind2=ret.lastIndexOf('.');
	if (ind2>=0) ret=ret.substr(0,ind2);
	return ret;
};
common.get_file_path=function(str) {
	if (!str) return '';
	var ind=str.lastIndexOf('/');
	if (ind>=0) return str.substr(0,ind);
	else return '';
};


exports.common=common;
