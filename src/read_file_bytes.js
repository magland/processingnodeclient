var fs=require('fs');

var path=process.argv[2]||'';
var bytes=process.argv[3]||'';
if ((!path)||(!bytes)) {
	return;
}
read_file_bytes(path,bytes);

function read_file_bytes_subarray(path,bytes) {
	var list1=bytes.split(';');
	var offset=0;
	var size=1;
	var dimensions=[1,1,1,1];
	var index=[0,0,0,0];
	list1.forEach(function(str1) {
		var vals1=str1.split('=');
		if (vals1.length==2) {
			var val1=vals1[0];
			var val2=vals1[1];
			if (val1=='offset') {
				offset=Number(val2);
			}
			else if (val1=='size') {
				size=Number(val2);
			}
			else if (val1=='dimensions') {
				var tmp1=val2.split(',');
				for (var k=0; k<tmp1.length; k++) {
					if (k<4) dimensions[k]=Number(tmp1[k]);
				}
			}
			else if (val1=='index') {
				var tmp1=val2.split(',');
				for (var k=0; k<tmp1.length; k++) {
					if (k<4) {
						if (tmp1[k]=='*') index[k]=-1;
						else index[k]=Number(tmp1[k]);
					}
				}
			}
		}
	});
	
	var fd;
	try {
		fd=fs.openSync(path,'r');
	}
	catch(err) {
		return false;
	}
	
	var i1min=index[0],i1max=index[0]; if (index[0]<0) {i1min=0; i1max=dimensions[0]-1;}
	var i2min=index[1],i2max=index[1]; if (index[1]<0) {i2min=0; i2max=dimensions[1]-1;}
	var i3min=index[2],i3max=index[2]; if (index[2]<0) {i3min=0; i3max=dimensions[2]-1;}
	var i4min=index[3],i4max=index[3]; if (index[3]<0) {i4min=0; i4max=dimensions[3]-1;}
	
	var curpos=offset;
	for (var i4=i4min; i4<=i4max; i4++) {
		if (index[3]>=0) {curpos+=dimensions[0]*dimensions[1]*dimensions[2]*index[3]*size;}
		for (var i3=i3min; i3<=i3max; i3++) {
			if (index[2]>=0) {curpos+=dimensions[0]*dimensions[1]*index[2]*size;}
			for (var i2=i2min; i2<=i2max; i2++) {
				if (index[1]>=0) {curpos+=dimensions[0]*index[1]*size;}
				{
					if (index[0]>=0) {
						curpos+=index[0]*size;
							var buf=new Buffer(size);
							if (fs.readSync(fd,buf,0,size,curpos)!=size) {
								fs.closeSync(fd);
								return false;
							}
							process.stdout.write(buf);
							curpos+=size;
						curpos+=(dimensions[0]-index[0]-1)*size;
					}
					else {
							var buf=new Buffer(dimensions[0]*size);
							if (fs.readSync(fd,buf,0,dimensions[0]*size,curpos)!=dimensions[0]*size) {
								fs.closeSync(fd);
								return false;
							}
							process.stdout.write(buf);
						curpos+=dimensions[0]*size;
					}
				}
				if (index[1]>=0) {curpos+=dimensions[0]*(dimensions[1]-index[1]-1)*size;}
			}
			if (index[2]>=0) {curpos+=dimensions[0]*dimensions[1]*(dimensions[2]-index[2]-1)*size;}
		}
		if (index[3]>=0) {curpos+=dimensions[0]*dimensions[1]*dimensions[2]*(dimensions[3]-index[3]-1)*size;}
	}
	fs.close(fd);
	return true;
}

function read_entire_file(path) {
	var fd;
	try {
		fd=fs.openSync(path,'r');
	}
	catch(err) {
		return false;
	}
	
	var chunksize=1000;
	var done=false;
	var curpos=0;
	while (!done) {
		var buf=new Buffer(chunksize);
		var num_bytes_read=fs.readSync(fd,buf,0,chunksize,curpos);
		curpos+=num_bytes_read;
		if (num_bytes_read==chunksize) {
			process.stdout.write(buf);
		}
		else if (num_bytes_read>0) {
			process.stdout.write(buf.slice(0,num_bytes_read));
		}
		else {
			done=true;
		}
	}
	
	fs.closeSync(fd);
	
	return true;
}

function read_file_bytes(path,bytes) {
	if ((bytes=="*")||(bytes=="")) {
		return read_entire_file(path);
	}
	if (bytes.indexOf("subarray")===0) {
		return read_file_bytes_subarray(path,bytes);
	}
	
	var fd;
	try {
		fd=fs.openSync(path,'r');
	}
	catch(err) {
		return false;
	}
	
	var bytes_list=bytes.split(',');
	var ret=true;
	for (var i=0; i<bytes_list.length; i++) {		
		var b0=bytes_list[i];
		var list0=b0.split(':');
		var list1=[];
		list0.forEach(function(str) {
			list1.push(Number(str));
		});
		if ((list1.length==3)&&(list1[1]==1)) list1=[list1[0],list1[2]];
		if (list1.length==1) {
			var buf=new Buffer(1);
			if (fs.readSync(fd,buf,0,1,list1[0])!=1) {
				fs.closeSync(fd);
				return false;
			}
			process.stdout.write(buf);
		}
		else if (list1.length==2) {
			var size=list1[1]-list1[0]+1;
			var buf=new Buffer(size);
			var num_bytes_read=fs.readSync(fd,buf,0,size,list1[0]);
			if (num_bytes_read!=size) {
				fs.closeSync(fd);
				return false;
			}
			process.stdout.write(buf);
		}
		else if (list1.length==3) {
			for (var j=list1[0]; j<=list1[2]; j+=list1[1]) {
				var buf=new Buffer(1);
				if (fs.readSync(fd,buf,0,1,j)!=1) {
					fs.closeSync(fd);
					return false;
				}
				process.stdout.write(buf);
			}
		}
	}
	fs.closeSync(fd);
}




