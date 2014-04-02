function A=readArray(fname)

[f_path,f_name,f_ext]=fileparts(fname);
if (strcmp(f_ext,'.nii'))
	tmp=readNii(fname);
	A=tmp.image;
	return;
end;

F=fopen(fname,'rb','ieee-le');

code=fread(F,1,'int32');

if (code>0) 
    num_dims=code;
    code=-1;
else
    fread(F,1,'int32');
    num_dims=fread(F,1,'int32');    
end;

S=zeros(1,num_dims);
for j=1:num_dims
    S(j)=fread(F,1,'int32');
end;
N=prod(S);

A=zeros(S);
if (code==-1)
    M=zeros(1,N*2);
    M(:)=fread(F,N*2,'float32');
    A(:)=M(1:2:prod(S)*2)+i*M(2:2:prod(S)*2);
elseif (code==-2)
    A(:)=fread(F,N,'uint8');
elseif (code==-3)
    A(:)=fread(F,N,'float32');
elseif (code==-4)
    A(:)=fread(F,N,'int16');
elseif (code==-5)
    A(:)=fread(F,N,'int32');
end;

fclose(F);

end





